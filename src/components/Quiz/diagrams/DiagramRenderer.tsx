import type { DiagramData } from '@/infrastructure/validation/QuizValidator'
import { HierarchyDiagram } from './HierarchyDiagram'
import { FlowDiagram } from './FlowDiagram'
import { CycleDiagram } from './CycleDiagram'
import { ComparisonDiagram } from './ComparisonDiagram'

interface DiagramRendererProps {
  diagram: DiagramData
}

export function DiagramRenderer({ diagram }: DiagramRendererProps) {
  switch (diagram.type) {
    case 'hierarchy':
      return <HierarchyDiagram label={diagram.label} items={diagram.items} />
    case 'flow':
      return <FlowDiagram label={diagram.label} steps={diagram.steps} />
    case 'cycle':
      return <CycleDiagram label={diagram.label} trigger={diagram.trigger} states={diagram.states} />
    case 'comparison':
      return <ComparisonDiagram label={diagram.label} columns={diagram.columns} />
    default:
      return null
  }
}
