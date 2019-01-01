/**
 * Creating HTMLElement from HTML string
 * @param html {String}: HTML string
 * @returns {ChildNode}: HTMLElement
 */
export default function (html) {
  const node = document.createElement("div")
  node.innerHTML = html
  return node.firstChild
}
