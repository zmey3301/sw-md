import uuid from "uuid/v4"
import debounce from "lodash.debounce"
import MDIcon from "./assets/images/markdown.svg"
import createElement from "./utils/createElement"
const buttonHTML =
`<button type="button" role="button" tabindex="-1" data-cmd="XfMdCode" class="fr-btn fr-command fr-btn-font_awesome md__btn" title="Открыть редактор markdown">${MDIcon}</button>`
const mdTextarea = "<textarea class='input md__textarea'></textarea>"
export default class {
  id = uuid()
  #button = createElement(buttonHTML)
  #mdTextarea = createElement(mdTextarea)
  #bbTextareaSelector = "textarea[name='message']"
  #bbModeButton = null
  #bbTextarea = null
  #opened = false
  #openingEditor = false
  #needToChangeViewer = false
  #observer = new MutationObserver((mutations) => {
    // Observing current bb textarea status 4 better editor change
    const openEditor = () => {
      if (this.#openingEditor && !this.#bbTextarea.hasAttribute("disabled") && this.#bbTextarea.style.display !== "none") {
        this.editorOpened = true
        this.#openingEditor = false
      }
    }
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        const bbTextarea = Array.from(mutation.addedNodes).find(element => element.matches(this.#bbTextareaSelector))
        if (bbTextarea) {
          this.#bbTextarea = bbTextarea
          this.#observer.observe(bbTextarea, {attributes: true, attributeFilter: ["disabled", "style"]})
          openEditor()
        }
      } else if (mutation.type === "attributes") openEditor()
    }
  })

  constructor (node) {
    const toolbar = node.querySelector(".fr-toolbar")
    const inputWrapper = node.querySelector(".fr-box.bbWrapper")

    window.MDEditors = {[this.id]: this, ...window.MDEditors}
    node.setAttribute("data-md-editor", this.id)

    this.#bbModeButton = toolbar.querySelector("[data-cmd=\"xfBbCode\"]")

    toolbar.appendChild(this.#button)
    this.#button.addEventListener("click", this.toggleEditor.bind(this))

    this.#mdTextarea.style.display = "none"
    this.#mdTextarea.addEventListener("input", this.updateMain.bind(this))
    inputWrapper.appendChild(this.#mdTextarea)

    this.#bbTextarea = node.querySelector(this.#bbTextareaSelector)
    if (!this.#bbTextarea) this.#observer.observe(inputWrapper, {childList: true})
    else this.#observer.observe(this.#bbTextarea, {attributes: true, attributeFilter: ["disabled", "style"]})
  }

  get editorOpened () {
    return this.#opened
  }

  set editorOpened (newValue) {
    this.#opened = newValue
    this.#button.classList.toggle("_active", newValue)
    this.#bbModeButton.classList.toggle("mde-hard-disable", newValue)
    this.#mdTextarea.style.display = newValue ? "" : "none"
    this.#bbTextarea.style.display = newValue ? "none" : ""
    if (newValue) {
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
      if (changing) {
        this.#openingEditor = true
        this.toggleBBViewer()
      } else proceed()
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

  escape (escape, string, type) {
    const patterns = {
      md: "\\*{2}|(?<![\\*\\[])\\*(?![\\*\\]])|_{2}|~{2}|<{2}|>{2}|\\^{2}|`{3}|(?<!`)`(?!`)|~{3}|[MmМм!]\\[[^]*?]\\([^]+?\\)|!\\([^]+?\\)|#{1,7}",
      bb: "\\[(?:B|I|U|S|LEFT|RIGHT|CENTER|IMG|MEDIA|CODE|URL|SIZE|SPOILER)=?[^]*?]"
    }
    return string.replace(new RegExp(`(${escape ? "?<!\\\\)(" : "\\\\"}(?:${patterns[type]}))`, "gim"), match => escape ? `\\${match}` : match.replace(/^\\+/, ""))
  }

  BB2MD (text) {
    const basicSyntaxReplace = (text, bb, md) => text.replace(new RegExp(`(?<!\\\\)\\[${bb}]([^]+?)\\[\/${bb}]`, "gi"), `${md}$1${md}`)
    // Parsing code
    text = text
      .replace(/(?<!\\)\[CODE(?:=(.+?)|)]\n?([^]+?)\[\/CODE]/gi, (_, mode, code) => `\`\`\`${mode ?? ""}\n${mode?.toLowerCase() !== "rich" ? this.escape(true, code, "bb") : code}\`\`\``)
      .replace(/(?<!\\)\[ICODE]([^]+?)\[\/ICODE]/gi, (_, code) => `\`${this.escape(true, code, "bb")}\``)
    // Parsing bold
    text = basicSyntaxReplace(text, "B", "**")
    // Parsing italic
    text = basicSyntaxReplace(text, "I", "*")
    // Parsing underlined
    text = basicSyntaxReplace(text, "U", "__")
    // Parsing line through
    text = basicSyntaxReplace(text, "S", "~~")
    // Parsing align left
    text = basicSyntaxReplace(text, "LEFT", "<<")
    // Parsing align right
    text = basicSyntaxReplace(text, "RIGHT", ">>")
    // Parsing align center
    text = basicSyntaxReplace(text, "CENTER", "^^")
    // Parsing img
    text = text.replace(/(?<!\\)\[IMG]([^]+?)\[\/IMG]/gi, "!($1)")
    // Parsing link
      .replace(/(?<!\\)\[URL(?:=(.+?)|)]([^]+?)\[\/URL]/gi, "![$1]($2)")
    // Parsing spoiler
      .replace(/(?<!\\)\[SPOILER=?([^]*?)]\n?([^]+?)\[\/SPOILER]/gi, "~~~$1\n$2~~~")
    // Parsing media
      .replace(/(?<!\\)\[MEDIA=([^]+?)]([^]+?)\[\/MEDIA]/gi, "M[$1]($2)")
    // Parsing header
      .replace(/^\s*(?<!\\)\[SIZE=([1-7])]([^]+?)\[\/SIZE]\s*$/gim, (_, size, content) => `${Array(8 - Number(size)).fill("#").join("")} ${content}`)
    return this.escape(false, text, "bb")
  }

  MD2BB (text) {
    const basicSyntaxReplace = (text, bb, md) => text.replace(new RegExp(`(?<!\\\\)${md}([^]+?)(?<!\\\\)${md}`, "gm"), `[${bb}]$1[/${bb}]`)
    // Parsing code
    text = text
      .replace(/(?<!\\)`{3}(.*?)\n([^]+?)(?<!\\)`{3}/g, (_, mode, code) => `[CODE${mode ? `=${mode}` : ""}]\n${mode?.toLowerCase() !== "rich" ? this.escape(true, code, "md") : code}[/CODE]`)
      .replace(/(?<![\\`])`(?!`)([^]+?)(?<!\\)(?<![\\`])`(?!`)/g, (_, code) => `[ICODE]${this.escape(true, code, "md")}[/ICODE]`)
    // Parsing bold
    text = basicSyntaxReplace(text, "B", "\\*{2}")
    // Parsing italic
    text = basicSyntaxReplace(text, "I", "(?<![\\*\\[])\\*(?![\\*\\]])")
    // Parsing line through
    text = basicSyntaxReplace(text, "S", "(?<!~)~{2}(?!~)")
    // Parsing underlined
    text = basicSyntaxReplace(text, "U", "_{2}")
    // Parsing align left
    text = basicSyntaxReplace(text, "LEFT", "<{2}")
    // Parsing align right
    text = basicSyntaxReplace(text, "RIGHT", ">{2}")
    // Parsing align center
    text = basicSyntaxReplace(text, "CENTER", "\\^{2}")
    // Parsing img
    text = text
      .replace(/(?<!\\)!\((.+?)\)/g, "[IMG]$1[/IMG]")
    // Parsing link
      .replace(/(?<!\\)!\[(.*?)]\((.+?)\)/g, (_, title, url) => `[URL${title ? `=${title}` : ""}]${url}[/URL]`)
    // Parsing spoiler
      .replace(/(?<!\\)~{3}(.*?)\n([^]+?)(?<!\\)~{3}/g, (_, title, content) => `[SPOILER${title ? `=${title}` : ""}]\n${content}[/SPOILER]`)
    // Parsing media
      .replace(/(?<!\\)[MmМм]\[(.+?)]\((.+?)\)/g, "[MEDIA=$1]$2[/MEDIA]")
    // Parsing head
      .replace(/^\s*(?<!\\)(#{1,7})\s?(.+?)\s*$/gm, (_, prefix, content) => `[SIZE=${8 - prefix.length}]${content}[/SIZE]`)
    return this.escape(false, text, "md")
  }

  destroy () {
    delete window.MDEditors[this.id]
    this.#button.removeEventListener("click", this.toggleEditor)
    this.#button.parentElement.removeChild(this.#button)
  }
}
