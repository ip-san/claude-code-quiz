import type { DiagramData } from '@/infrastructure/validation/QuizValidator'
import { ComparisonDiagram } from './ComparisonDiagram'
import { ConfigDiagram } from './ConfigDiagram'
import { CycleDiagram } from './CycleDiagram'
import { FlowDiagram } from './FlowDiagram'
import { HierarchyDiagram } from './HierarchyDiagram'
import { TerminalDiagram } from './TerminalDiagram'

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
    case 'terminal':
      return <TerminalDiagram label={diagram.label} lines={diagram.lines} />
    case 'config':
      return <ConfigDiagram label={diagram.label} filepath={diagram.filepath} lines={diagram.lines} />
    default:
      return null
  }
}
