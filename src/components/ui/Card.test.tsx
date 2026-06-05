import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card'

describe('Card Component', () => {
  it('renders correctly with children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeTruthy()
  })

  it('renders with title and description props', () => {
    render(
      <Card
        title="My Title"
        description="My Description"
      >
        Body
      </Card>
    )
    expect(screen.getByRole('heading', { name: 'My Title' })).toBeTruthy()
    expect(screen.getByText('My Description')).toBeTruthy()
    expect(screen.getByText('Body')).toBeTruthy()
  })

  it('renders with footer and actions', () => {
    render(
      <Card
        footer={<div data-testid="footer">Footer</div>}
        actions={<button data-testid="action">Action</button>}
      >
        Body
      </Card>
    )
    expect(screen.getByTestId('footer')).toBeTruthy()
    expect(screen.getByTestId('action')).toBeTruthy()
  })

  it('applies correct variant classes', () => {
    const { rerender, container } = render(<Card variant="elevated">Content</Card>)
    expect(container.firstChild).toHaveClass('shadow-md')

    rerender(<Card variant="flat">Content</Card>)
    expect(container.firstChild).toHaveClass('shadow-none')
  })

  it('renders sub-components correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByRole('heading', { name: 'Title' })).toBeTruthy()
    expect(screen.getByText('Description')).toBeTruthy()
    expect(screen.getByText('Content')).toBeTruthy()
    expect(screen.getByText('Footer')).toBeTruthy()
  })
})
