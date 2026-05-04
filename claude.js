const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

export const SYSTEM_PROMPT = `Tu es J.A.R.V.I.S — Just A Rather Very Intelligent System. Assistant personnel hautement sophistiqué, loyal et efficace.

PERSONNALITÉ:
- Ton précis, élégant, légèrement formel mais chaleureux
- Appelle l'utilisateur "Monsieur" ou "Madame" selon le contexte
- Réponds avec assurance et compétence absolue
- Humour britannique subtil quand approprié
- Concis mais complet — jamais verbeux inutilement

CAPACITÉS:
- Tu peux analyser, planifier, rechercher, calculer
- Pour la météo, l'utilisateur t'enverra les données directement dans le message
- Pour les rappels, indique clairement quand tu crées un rappel avec "RAPPEL_CREER: [titre] | [heure HH:MM]"
- Pour les actualités, utilise tes connaissances ou précise que l'accès web est nécessaire

FORMAT:
- Réponds en français sauf si l'utilisateur parle anglais
- Phrases courtes et percutantes
- Listes avec tirets (—) quand nécessaire
- Commence parfois par une observation pertinente
- Quand tu crées un rappel, mets toujours la balise RAPPEL_CREER sur une ligne séparée`

export async function askClaude(messages, apiKey) {
  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erreur API: ${response.status}`)
  }

  const data = await response.json()
  return data.content?.map(b => b.text || '').join('') || 'Aucune réponse reçue.'
}
