import React, { useState } from 'react'
import {
  Button, Card, Badge, Input, Modal, EmptyState, Skeleton
} from './components/ui'
import { Search, Plus, Info, CheckCircle, Trash2, Mail } from 'lucide-react'

export const ComponentGallery: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="p-8 space-y-12 bg-bg min-h-screen">
      <section>
        <h2 className="text-2xl font-bold mb-6">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <p className="text-sm text-text-muted">Variants</p>
            <div className="flex gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-text-muted">Sizes</p>
            <div className="flex gap-2 items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-text-muted">States</p>
            <div className="flex gap-2">
              <Button isLoading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-text-muted">Icons</p>
            <div className="flex gap-2">
              <Button leftIcon={<Plus size={18} />}>Add</Button>
              <Button rightIcon={<Search size={18} />} variant="secondary">Search</Button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Badges</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Badge>Default</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge size="sm" variant="success">Small Badge</Badge>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            title="Default Card"
            description="Standard card with shadow-sm"
            actions={<Button variant="ghost" size="sm"><Info size={16} /></Button>}
            footer={<Button size="sm" className="w-full">Action</Button>}
          >
            <p className="text-sm">This is the card body content. It uses the default variant.</p>
          </Card>
          <Card
            variant="flat"
            title="Flat Card"
            description="No shadow, just border"
          >
            <p className="text-sm">This card is flat. Good for nested content.</p>
          </Card>
          <Card
            variant="elevated"
            title="Elevated Card"
            description="More shadow for depth"
          >
            <p className="text-sm">This card is elevated. Use sparingly for emphasis.</p>
          </Card>
        </div>
      </section>

      <section className="max-w-md">
        <h2 className="text-2xl font-bold mb-6">Inputs</h2>
        <div className="space-y-4">
          <Input label="Default Input" placeholder="Type something..." />
          <Input
            label="Input with Icon"
            placeholder="Search..."
            leftIcon={<Search size={18} />}
          />
          <Input
            label="Input with Error"
            placeholder="email@example.com"
            error="Please enter a valid email address"
            defaultValue="invalid-email"
            rightIcon={<Mail size={18} />}
          />
          <Input
            label="Input with Helper"
            placeholder="Password"
            type="password"
            helperText="Must be at least 8 characters long"
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Modal</h2>
        <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Confirm Action"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => setIsModalOpen(false)}>Delete</Button>
            </>
          }
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-error/10 text-error rounded-full">
              <Trash2 size={24} />
            </div>
            <div>
              <p className="text-text font-medium">Are you sure you want to delete this?</p>
              <p className="text-sm text-text-muted mt-1">This action cannot be undone. All data will be permanently removed.</p>
            </div>
          </div>
        </Modal>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Empty State</h2>
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={<CheckCircle size={40} />}
            title="No Documents Yet"
            description="Upload your first payslip or bank statement to get started with financial analysis."
            action={{ label: 'Upload Document', onClick: () => alert('Action!') }}
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Skeletons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card title={<Skeleton variant="heading" width="60%" />} description={<Skeleton variant="text" width="40%" />}>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton variant="avatar" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" width="30%" />
                  <Skeleton variant="text" width="20%" />
                </div>
              </div>
              <Skeleton variant="text" />
              <Skeleton variant="text" />
              <Skeleton variant="text" width="80%" />
            </div>
          </Card>
          <div className="space-y-4">
            <Skeleton variant="image" />
          </div>
        </div>
      </section>
    </div>
  )
}
