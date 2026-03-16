export function buildConflictDetectionPrompt(input: {
  sourceALabel: string
  sourceAId: string
  sourceAVersion: string
  sourceBLabel: string
  sourceBId: string
  sourceBVersion: string
}): string {
  return [
    'Detect knowledge conflicts between two sources.',
    `Source A: ${input.sourceALabel} (${input.sourceAId}, version: ${input.sourceAVersion})`,
    `Source B: ${input.sourceBLabel} (${input.sourceBId}, version: ${input.sourceBVersion})`,
    '',
    'Return strict JSON in this shape and nothing else:',
    '{',
    '  "conflicts": [',
    '    {',
    '      "topic": "short topic label",',
    '      "claimA": "claim from source A",',
    '      "claimB": "conflicting claim from source B",',
    '      "severity": "high|medium|low",',
    '      "confidence": 0.0,',
    '      "rationale": "why they conflict"',
    '    }',
    '  ]',
    '}',
    '',
    'Rules:',
    '- Use only direct contradictions backed by evidence.',
    '- If there are no conflicts, return {"conflicts": []}.',
    '- confidence must be between 0 and 1.',
  ].join('\n')
}
