import uuid from "uuid/v4"
import debounce from "lodash.debounce"
import MDIcon from "./assets/images/markdown.svg"
import createElement from "./utils/createElement"
const buttonHTML =
`<button type="button" role="button" tabindex="-1" data-cmd="XfMdCode" class="fr-btn fr-command fr-btn-font_awesome md__btn" title="Открыть редактор markdown">${MDIcon}</button>`
const mdTextarea = "<textarea class='input md__input'></textarea>"
export default class {
  id = uuid()
  #button = createElement(buttonHTML)
  #mdTextarea = createElement(mdTextarea)
  #bbModeButton = null
  #bbTextarea = null
  #opened = false
  #needToChangeViewer = false

  constructor (node) {
    const toolbar = node.querySelector(".fr-toolbar")
    const bbTextareaSelector = "textarea[name='message']"

    window.MDEditors = {[this.id]: this, ...window.MDEditors}
    node.setAttribute("data-md-editor", this.id)

    this.#bbModeButton = toolbar.querySelector("[data-cmd=\"xfBbCode\"]")

    toolbar.appendChild(this.#button)
    this.#button.addEventListener("click", this.toggleEditor.bind(this))

    this.#mdTextarea.style.display = "none"
    this.#mdTextarea.addEventListener("input", this.updateMain.bind(this))
    node.querySelector(".fr-box.bbWrapper").appendChild(this.#mdTextarea)

    this.#bbTextarea = node.querySelector(bbTextareaSelector)
    if (!this.#bbTextarea) this.#bbModeButton.addEventListener("mouseup", () => {
      setTimeout(() => {this.#bbTextarea = node.querySelector(bbTextareaSelector)})
    }, {once: true})
  }

  get editorOpened () {
    return this.#opened
  }

  set editorOpened (newValue) {
    console.log("opened", newValue)
    this.#opened = newValue
    this.#button.classList.toggle("_active", newValue)
    this.#mdTextarea.style.display = newValue ? "" : "none"
    this.#bbTextarea.style.display = newValue ? "none" : ""
    if (newValue) {
      console.log(this.BB2MD(this.#bbTextarea.value))
      this.#mdTextarea.value = this.BB2MD(this.#bbTextarea.value)
    } else if (this.#needToChangeViewer) {
      this.toggleBBViewer()
      this.#needToChangeViewer = false
    }
  }

  toggleEditor () {
    const proceed = () => {this.editorOpened = !this.editorOpened}
    if (!this.editorOpened) {
      const changing = this.#needToChangeViewer = this.#bbTextarea?.hasAttribute("disabled") ?? true
      if (changing) this.toggleBBViewer()
      setTimeout(proceed)
    } else proceed()
  }

  toggleBBViewer () {
    const eventConfig = {'view': window, 'bubbles': true, 'cancelable': true}
    this.#bbModeButton.dispatchEvent(new MouseEvent("mousedown", eventConfig))
    this.#bbModeButton.dispatchEvent(new MouseEvent("mouseup", eventConfig))
  }

  updateMain = debounce(function () {
    this.#bbTextarea.value = this.MD2BB(this.#mdTextarea.value)
  }, 300)

  BB2MD (text) {
    const basicSyntaxReplace = (text, bb, md) => text.replace(new RegExp(`\\[${bb}]([^]+?)\\[\/${bb}]`, "gim"), `${md}$1${md}`)
    // Parsing bold
    text = basicSyntaxReplace(text, "B", "**")
    // Parsing italic
    text = basicSyntaxReplace(text, "I", "*")
    // Parsing underlined
    text = basicSyntaxReplace(text, "U", "__")
    // Parsing line through
    text = basicSyntaxReplace(text, "S", "--")
    // Parsing simple code
    text = basicSyntaxReplace(text, "CODE", "`")
    // Parsing highlighted code
    text = text.replace(/\[CODE=([^]+?)]([^]+?)\[\/CODE]/gim, "```$1\n$2\n```")
    // Parsing img
    text = text.replace(/\[IMG]([^]+?)\[\/IMG]/gim, "!($1)")
    // Parsing link
    text = text.replace(/\[URL=?([^]*?)]([^]+?)\[\/URL]/gim, (_, url, title) => url ? `![${title}](${url})` : `![](${title})`)
    // Parsing spoiler
    return text.replace(/\[SPOILER=?([^]*?)]([^]+?)\[\/SPOILER]/gim, "~~~$1\n$2\n~~~")
  }

  MD2BB (text) {
    const basicSyntaxReplace = (text, bb, md, exclude="") => text.replace(new RegExp(`${md}([^${exclude}]+?)${md}`, "gm"), `[${bb}]$1[/${bb}]`)
    // Parsing bold
    text = basicSyntaxReplace(text, "B", "\\*\\*")
    // Parsing italic
    text = basicSyntaxReplace(text, "I", "\\*")
    // Parsing underlined
    text = basicSyntaxReplace(text, "U", "__")
    // Parsing line through
    text = basicSyntaxReplace(text, "S", "--")
    // Parsing highlighted code
    text = text.replace(/`{3}([^]*?)\n([^]+?)`{3}/gm, "[CODE=$1]$2[/CODE]")
    // Parsing simple code
    text = basicSyntaxReplace(text, "CODE", "`", "`")
    // Parsing img
    text = text.replace(/!\(([^]+?)\)/gm, "[IMG]$1[/IMG]")
    // Parsing link
    text = text.replace(/!\[([^]*?)]\(([^]+?)\)/gm, (_, title, url) => title ? `[URL=${url}]${title}[/URL]` : `[URL]${url}[/URL]`)
    // Parsing spoiler
    return text.replace(/~~~([^]*?)\n([^]+?)~~~/gm, (_, title, content) => `[SPOILER${title ? `=${title}` : ""}]${content}[/SPOILER]`)
  }

  destroy () {
    console.log("destroyed")
    delete window.MDEditors[this.id]
    this.#button.removeEventListener("click", this.toggleEditor)
    this.#button.parentElement.removeChild(this.#button)
  }
}
