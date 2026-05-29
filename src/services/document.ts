import { storage, db } from '../firebase'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  getDoc,
  type QueryConstraint,
} from 'firebase/firestore'
import type { FinancialDocument, DocumentType, DocumentStatus, ApiResult } from '../types'
import { logAudit } from './audit'

const COLLECTION = (uid: string) => `users/${uid}/documents`
const STORAGE_PATH = (uid: string, fileName: string) =>
  `users/${uid}/documents/${Date.now()}_${fileName}`

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Carica un file su Storage e crea il documento su Firestore
 * onProgress: callback opzionale con percentuale 0–100
 */
export async function uploadDocument(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<ApiResult<FinancialDocument>> {
  try {
    // Validazione mimeType
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { success: false, error: 'Formato file non supportato. Caricare PDF, JPG o PNG.' }
    }

    // Validazione fileSize
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Il file supera la dimensione massima di 10MB.' }
    }

    const storagePath = STORAGE_PATH(uid, file.name)
    const storageRef = ref(storage, storagePath)
    const uploadTask = uploadBytesResumable(storageRef, file)

    return new Promise((resolve) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          if (onProgress) onProgress(progress)
        },
        (error) => {
          resolve({ success: false, error: error.message })
        },
        () => {
          void (async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)

              const now = Timestamp.now()
              const docData: Omit<FinancialDocument, 'id'> = {
                type: 'altro',
                status: 'uploaded',
                fileName: file.name,
                storagePath,
                downloadUrl,
                fileSize: file.size,
                mimeType: file.type as 'application/pdf' | 'image/jpeg' | 'image/png',
                createdAt: now,
                updatedAt: now,
              }

              const colRef = collection(db, COLLECTION(uid))
              const docRef = await addDoc(colRef, docData)

              const document: FinancialDocument = {
                id: docRef.id,
                ...docData,
              }

              await logAudit({
                uid,
                action: 'create',
                entityType: 'document',
                entityId: docRef.id,
                newValue: docData,
              })

              resolve({ success: true, data: document })
            } catch (e) {
              resolve({ success: false, error: e instanceof Error ? e.message : String(e) })
            }
          })()
        }
      )
    })
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Restituisce tutti i documenti dell'utente
 */
export async function listDocuments(
  uid: string,
  filters?: { type?: DocumentType; status?: DocumentStatus }
): Promise<ApiResult<FinancialDocument[]>> {
  try {
    const colRef = collection(db, COLLECTION(uid))
    const constraints: QueryConstraint[] = []

    if (filters?.type) {
      constraints.push(where('type', '==', filters.type))
    }
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status))
    }

    // orderBy solo se nessun filtro where per evitare indice composito obbligatorio
    if (constraints.length === 0) {
      constraints.push(orderBy('createdAt', 'desc'))
    }

    const q = query(colRef, ...constraints)
    const snap = await getDocs(q)
    const documents = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as FinancialDocument)
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())

    return { success: true, data: documents }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Classifica un documento (aggiorna type e status → 'classified')
 */
export async function classifyDocument(
  uid: string,
  documentId: string,
  type: DocumentType,
  documentDate?: Date
): Promise<ApiResult<FinancialDocument>> {
  try {
    const docRef = doc(db, COLLECTION(uid), documentId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Documento non trovato' }

    const currentData = snap.data() as FinancialDocument
    const newStatus: DocumentStatus = currentData.status === 'linked' ? 'linked' : 'classified'

    const updates: Partial<FinancialDocument> = {
      type,
      status: newStatus,
      updatedAt: Timestamp.now(),
      ...(documentDate ? { documentDate: Timestamp.fromDate(documentDate) } : {}),
    }

    await updateDoc(docRef, updates)

    const updatedDocument = { ...currentData, ...updates, id: documentId }

    await logAudit({
      uid,
      action: 'update',
      entityType: 'document',
      entityId: documentId,
      previousValue: currentData as unknown as Record<string, unknown>,
      newValue: updatedDocument,
    })

    return { success: true, data: updatedDocument }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Collega un documento a un'entità Firestore (payslip, investment, snapshot)
 */
export async function linkDocument(
  uid: string,
  documentId: string,
  linkedEntityType: FinancialDocument['linkedEntityType'],
  linkedEntityId: string
): Promise<ApiResult<FinancialDocument>> {
  try {
    const docRef = doc(db, COLLECTION(uid), documentId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Documento non trovato' }

    const currentData = snap.data() as FinancialDocument

    const updates: Partial<FinancialDocument> = {
      linkedEntityId,
      status: 'linked',
      updatedAt: Timestamp.now(),
      ...(linkedEntityType ? { linkedEntityType } : {}),
    }

    await updateDoc(docRef, updates)

    const updatedDocument = { ...currentData, ...updates, id: documentId }

    await logAudit({
      uid,
      action: 'update',
      entityType: 'document',
      entityId: documentId,
      previousValue: currentData as unknown as Record<string, unknown>,
      newValue: updatedDocument,
    })

    return { success: true, data: updatedDocument }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Aggiorna note di un documento
 */
export async function updateDocumentNote(
  uid: string,
  documentId: string,
  note: string
): Promise<ApiResult<FinancialDocument>> {
  try {
    const docRef = doc(db, COLLECTION(uid), documentId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Documento non trovato' }

    const currentData = snap.data() as FinancialDocument

    const updates: Partial<FinancialDocument> = {
      note,
      updatedAt: Timestamp.now(),
    }

    await updateDoc(docRef, updates)

    const updatedDocument = { ...currentData, ...updates, id: documentId }

    await logAudit({
      uid,
      action: 'update',
      entityType: 'document',
      entityId: documentId,
      previousValue: currentData as unknown as Record<string, unknown>,
      newValue: updatedDocument,
    })

    return { success: true, data: updatedDocument }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Elimina documento da Storage e da Firestore
 */
export async function deleteDocument(uid: string, documentId: string): Promise<ApiResult<void>> {
  try {
    const docRef = doc(db, COLLECTION(uid), documentId)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return { success: false, error: 'Documento non trovato' }

    const data = snap.data() as FinancialDocument

    // 1. Delete from Storage
    try {
      const storageRef = ref(storage, data.storagePath)
      await deleteObject(storageRef)
    } catch (error: unknown) {
      // Se Storage delete fallisce con codice storage/object-not-found, proseguiamo
      if (
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        (error as Record<string, unknown>).code === 'storage/object-not-found'
      ) {
        // Ignora
      } else {
        throw error
      }
    }

    // 2. Delete from Firestore
    await deleteDoc(docRef)

    await logAudit({
      uid,
      action: 'delete',
      entityType: 'document',
      entityId: documentId,
      previousValue: data as unknown as Record<string, unknown>,
    })

    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
