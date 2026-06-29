const PROVIDERS = {
	openai: {
		baseUrl: 'https://api.openai.com/v1',
		defaultModel: 'gpt-4o-mini',
	},
	mistral: {
		baseUrl: 'https://api.mistral.ai/v1',
		defaultModel: 'mistral-small-latest',
	},
	gemini: {
		baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
		defaultModel: 'gemini-1.5-flash',
	},
	openrouter: {
		baseUrl: 'https://openrouter.ai/api/v1',
		defaultModel: 'google/gemini-2.5-flash',
	},
}

let examHistory = []
let activeArticleContent = ''

export function getApiKey() {
	return localStorage.getItem('user_api_key') || ''
}

export function saveApiKey(key) {
	localStorage.setItem('user_api_key', key.trim())
}

export function getProvider() {
	return localStorage.getItem('active_provider') || 'openai'
}

export function saveProvider(provider) {
	localStorage.setItem('active_provider', provider)
}

export function getSelectedModel() {
	return localStorage.getItem('selected_model') || ''
}

export function saveSelectedModel(modelId) {
	localStorage.setItem('selected_model', modelId)
}

export function clearExamHistory() {
	examHistory = []
}

/**
 * Динамическая загрузка доступных моделей с сервера выбранного провайдера
 */
export async function fetchModels(provider, apiKey) {
	const config = PROVIDERS[provider]
	if (!config) return []

	const headers = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${apiKey}`,
	}

	const response = await fetch(`${config.baseUrl}/models`, {
		method: 'GET',
		headers: headers,
	})

	if (!response.ok) {
		throw new Error(
			'Не удалось получить список моделей. Проверьте правильность API-ключа.',
		)
	}

	const result = await response.json()
	return result.data || []
}

/**
 * Локальная фильтрация и поиск моделей по ключевым словам и ценовому тарифу
 */
export function filterModelsList(
	models,
	searchTerm = '',
	freeOnly = false,
	provider = '',
) {
	return models.filter(model => {
		const id = model.id || ''
		const name = model.name || id
		const nameMatch =
			name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			id.toLowerCase().includes(searchTerm.toLowerCase())

		if (!nameMatch) return false

		if (freeOnly) {
			if (provider === 'openrouter') {
				const promptPrice = model.pricing ? parseFloat(model.pricing.prompt) : 1
				const completionPrice = model.pricing
					? parseFloat(model.pricing.completion)
					: 1
				return promptPrice === 0 && completionPrice === 0
			}
			return (
				id.toLowerCase().includes('free') || name.toLowerCase().includes('free')
			)
		}

		return true
	})
}

export async function prepareExam(category, articleName) {
	clearExamHistory()
	try {
		const response = await fetch(
			`./articles/${category}/${encodeURIComponent(articleName)}.md`,
		)
		if (!response.ok) {
			throw new Error(`Не удалось загрузить материал статьи: ${articleName}`)
		}
		activeArticleContent = await response.text()
		return true
	} catch (error) {
		console.error(error)
		return false
	}
}

export async function sendExamMessage(userMessage = '') {
	const apiKey = getApiKey()
	const provider = getProvider()
	const config = PROVIDERS[provider]

	if (!apiKey || !config) {
		throw new Error('Настройте провайдера и укажите API-ключ в настройках.')
	}

	// Берем выбранную пользователем модель или дефолтную для этого провайдера
	const activeModel = getSelectedModel() || config.defaultModel

	const systemInstruction = `Ты — профессиональный технический interviewer и наставник по веб-разработке. Твоя задача — провести интерактивный устный экзамен для студента на основе следующего материала статьи:

---
${activeArticleContent}
---

ПРАВИЛА И СЦЕНАРИЙ ЭКЗАМЕНА:
1. Задай ровно 3 открытых вопроса по теме статьи поочередно. Вопросы не должны содержать вариантов ответов (A, B, C). Студент должен отвечать своими словами.
2. В самом первом сообщении (когда метод вызывается без реплики пользователя) поприветствуй студента, объяви тему экзамена и задай ТОЛЬКО ПЕРВЫЙ вопрос. Не пиши никакого лишнего текста.
3. Когда студент отвечает на вопрос:
   - Подробно проанализируй его ответ, сопоставив с материалом статьи.
   - Дай честную конструктивную оценку: укажи, что верно, какие важные детали упущены или перепутаны. Исправь его, если допущена ошибка.
   - Сразу после оценки задай следующий вопрос (2-й, затем 3-й).
4. После ответа на 3-й вопрос: оцени его, сделай краткое резюме по результатам всего экзамена (какие концепции усвоены отлично, а по каким стоит перечитать статью) и тепло заверши сессию.

КРИТИЧЕСКИ ВАЖНОЕ ПРАВИЛО:
Задавай строго ОДИН вопрос за одну реплику. Никогда не пиши два вопроса сразу. Жди ответа пользователя перед переходом к следующему вопросу.`

	const messages = [{ role: 'system', content: systemInstruction }]

	if (examHistory.length > 0) {
		messages.push(...examHistory)
	}

	if (userMessage) {
		messages.push({ role: 'user', content: userMessage })
	}

	const response = await fetch(`${config.baseUrl}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: activeModel,
			messages: messages,
			temperature: 0.7,
		}),
	})

	if (!response.ok) {
		const errorData = await response.json()
		throw new Error(
			errorData.error?.message ||
				'Произошла ошибка при отправке запроса к API выбранного ИИ.',
		)
	}

	const responseData = await response.json()
	const reply = responseData.choices[0].message.content

	if (userMessage) {
		examHistory.push({ role: 'user', content: userMessage })
	}
	examHistory.push({ role: 'assistant', content: reply })

	return reply
}
