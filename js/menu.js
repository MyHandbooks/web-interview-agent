let currentCategory = ''
let articlesData = null

export function renderMenu(articles) {
	articlesData = articles
	const selectorEl = document.getElementById('category-selector')
	const menuEl = document.getElementById('menu')
	if (!selectorEl || !menuEl) return

	selectorEl.innerHTML = ''
	const categories = Object.keys(articles)

	if (categories.length === 0) {
		menuEl.innerHTML = '<li>Нет доступных тем</li>'
		return
	}

	if (!currentCategory) {
		currentCategory = categories[0]
	}

	categories.forEach(category => {
		const btn = document.createElement('button')
		btn.className = 'category-tab-btn'
		if (category === currentCategory) {
			btn.classList.add('active')
		}
		btn.textContent = category.toUpperCase()
		btn.dataset.category = category

		btn.addEventListener('click', () => {
			switchCategory(category)
		})

		selectorEl.appendChild(btn)
	})

	renderActiveList()
}

function switchCategory(category) {
	currentCategory = category
	document.querySelectorAll('.category-tab-btn').forEach(btn => {
		if (btn.dataset.category === category) {
			btn.classList.add('active')
		} else {
			btn.classList.remove('active')
		}
	})
	renderActiveList()
}

function renderActiveList() {
	const menuEl = document.getElementById('menu')
	if (!menuEl || !articlesData || !currentCategory) return
	menuEl.innerHTML = ''

	const items = articlesData[currentCategory] || []
	items.forEach(name => {
		const li = document.createElement('li')
		const a = document.createElement('a')
		a.href = `#${currentCategory}/${encodeURIComponent(name)}`
		a.textContent = name
		a.dataset.category = currentCategory
		a.dataset.name = name
		li.appendChild(a)
		menuEl.appendChild(li)
	})
}

export function updateActiveMenuItem(activeCategory, activeName) {
	if (activeCategory !== currentCategory) {
		switchCategory(activeCategory)
	}

	document.querySelectorAll('#menu a').forEach(a => {
		if (
			a.dataset.category === activeCategory &&
			a.dataset.name === activeName
		) {
			a.classList.add('active')
		} else {
			a.classList.remove('active')
		}
	})
}

export function initMobileMenu() {
	const menuToggle = document.getElementById('menu-toggle')
	const sidebar = document.getElementById('sidebar')

	menuToggle.addEventListener('click', () => {
		menuToggle.classList.toggle('open')
		sidebar.classList.toggle('open')
	})

	const menuEl = document.getElementById('menu')
	if (menuEl) {
		menuEl.addEventListener('click', e => {
			if (e.target.tagName === 'A') {
				menuToggle.classList.remove('open')
				sidebar.classList.remove('open')
			}
		})
	}
}
