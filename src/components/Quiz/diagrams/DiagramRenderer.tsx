import type { DiagramData } from '@/infrastructure/validation/QuizValidator'
import { ComparisonDiagram } from './ComparisonDiagram'
import { ConfigDiagram } from './ConfigDiagram'
import { CycleDiagram } from './CycleDiagram'
import { FlowDiagram } from './FlowDiagram'
import { HierarchyDiagram } from './HierarchyDiagram'
import { TerminalDiagram } from './TerminalDiagram'

function SingleDiagram({ diagram }: { diagram: DiagramData }) {
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

interface DiagramRendererProps {
  diagram?: DiagramData | undefined
  diagrams?: readonly DiagramData[] | undefined
}

export function DiagramRenderer({ diagram, diagrams }: DiagramRendererProps) {
  const items = diagrams && diagrams.length > 0 ? diagrams : diagram ? [diagram] : []
  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      {items.map((d, i) => (
        <SingleDiagram key={i} diagram={d} />
      ))}
    </div>
  )
}
