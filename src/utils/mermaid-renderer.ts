export interface WorkflowStage {
  id: string;
  label: string;
}

export interface StateTransition {
  from: string;
  to: string;
  label?: string;
}

export interface SequenceMessage {
  from: string;
  to: string;
  message: string;
}

export interface GanttTask {
  name: string;
  start: string;
  end: string;
  section?: string;
}

export interface ErEntity {
  name: string;
  attributes: string[];
}

export interface ErRelation {
  from: string;
  to: string;
  label: string;
  type?: string;
}

export function buildWorkflowDiagram(stages: WorkflowStage[]): string {
  if (stages.length === 0) return "";
  const lines = ["graph LR"];
  stages.forEach((s, i) => {
    lines.push(`  ${s.id}["${s.label}"]`);
    if (i > 0) lines.push(`  ${stages[i - 1].id} --> ${s.id}`);
  });
  return lines.join("\n");
}

export function buildStateDiagram(
  states: string[],
  transitions: StateTransition[],
): string {
  const lines = ["stateDiagram-v2"];
  for (const t of transitions) {
    const label = t.label ? ` : ${t.label}` : "";
    lines.push(`  ${t.from} --> ${t.to}${label}`);
  }
  return lines.join("\n");
}

export function buildSequenceDiagram(
  participants: string[],
  messages: SequenceMessage[],
): string {
  const lines = ["sequenceDiagram"];
  for (const p of participants) {
    lines.push(`  participant ${p}`);
  }
  for (const m of messages) {
    lines.push(`  ${m.from}->>+${m.to}: ${m.message}`);
  }
  return lines.join("\n");
}

export function buildErDiagram(
  entities: ErEntity[],
  relations: ErRelation[],
): string {
  const lines = ["erDiagram"];
  for (const e of entities) {
    lines.push(`  ${e.name} {`);
    for (const attr of e.attributes) {
      lines.push(`    string ${attr}`);
    }
    lines.push("  }");
  }
  for (const r of relations) {
    const rel = r.type ?? "||--o{";
    lines.push(`  ${r.from} ${rel} ${r.to} : "${r.label}"`);
  }
  return lines.join("\n");
}

export function buildGanttDiagram(tasks: GanttTask[]): string {
  const lines = ["gantt", "  dateFormat YYYY-MM-DD"];
  const sections = new Map<string, GanttTask[]>();
  for (const t of tasks) {
    const sec = t.section ?? "기본";
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec)!.push(t);
  }
  for (const [sec, secTasks] of sections) {
    lines.push(`  section ${sec}`);
    for (const t of secTasks) {
      lines.push(`  ${t.name} :${t.start}, ${t.end}`);
    }
  }
  return lines.join("\n");
}

export function wrapMermaidHtml(definition: string): string {
  return `<pre class="mermaid">\n${definition}\n</pre>`;
}
