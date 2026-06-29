import { parseMarkdown } from './parser.js'
import { updateActiveMenuItem } from './menu.js'
import { resetExamUI, checkApiKeyStatus } from './exam-controller.js'

const ARTICLES_DIR = './articles'

async function loadArticle(category, name, articles) {
	const contentEl = document.getElementById('article-content')
	contentEl.innerHTML = '<div class="loader">Загрузка статьи...</div>'

	try {
		const response = await fetch(
			`${ARTICLES_DIR}/${category}/${encodeURIComponent(name)}.md`,
		)
		if (!response.ok) {
			throw new Error('Файл статьи не найден')
		}

		const markdown = await response.text()
		contentEl.innerHTML = parseMarkdown(markdown, articles)

		Prism.highlightAllUnder(contentEl)
	} catch (error) {
		contentEl.innerHTML = `<p class="error-msg">Не удалось загрузить статью "${name}".</p>`
	}
}

export function initRouter(articles) {
	const handleRoute = () => {
		const hash = window.location.hash.slice(1)

		if (!hash) {
			if (articles.js && articles.js.length > 0) {
				window.location.hash = `js/${encodeURIComponent(articles.js[0])}`
			}
			return
		}

		const slashIndex = hash.indexOf('/')
		if (slashIndex === -1) {
			return
		}

		const category = hash.substring(0, slashIndex)
		const articleName = decodeURIComponent(hash.substring(slashIndex + 1))

		const categoryArticles = articles[category]
		if (categoryArticles && categoryArticles.includes(articleName)) {
			loadArticle(category, articleName, articles)
			updateActiveMenuItem(category, articleName)
			resetExamUI()
			checkApiKeyStatus()
		}
	}

	window.addEventListener('hashchange', handleRoute)
	handleRoute()
}
