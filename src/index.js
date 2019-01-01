import MDEditor from "./MDEditor"
const username = document.querySelector(".p-navgroup-link--user > .p-navgroup-linkText")?.textContent
function pageObserver () {
  console.log("init", username)
  const messageContentSelector = ".message-cell--main"
  const messageObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.target.classList.contains("is-editing"))
        new MDEditor(mutation.target)
      else {
        window.MDEditors[mutation.target.getAttribute("data-md-editor")].destroy()
      }
    }
  })
  const observeMessage = node => messageObserver.observe(node.querySelector(messageContentSelector), {attributes: true, attributeFilter: ["class"]})
  const listObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes)
        observeMessage(node)
      for (const node of mutation.removedNodes)
        messageObserver.unobserve(node.querySelector(messageContentSelector))
    }
  })
  for (const container of Array.from(document.querySelectorAll(".js-replyNewMessageContainer"))) {
    listObserver.observe(container, {childList: true})
    for (const message of Array.from(container.querySelectorAll(`article.message[data-author="${username}"]`)))
      observeMessage(message)
  }
  const quickReply = document.querySelectorAll(".js-quickReply")
  for (const input of Array.from(quickReply)) new MDEditor(input)
}
if (username) pageObserver()
