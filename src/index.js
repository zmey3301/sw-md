import MDEditor from "./MDEditor"
const username = document.querySelector(".p-navgroup-link--user > .p-navgroup-linkText")?.textContent
function pageObserver () {
  console.log("init", username)
  const messageContentSelector = ".message-cell--main"
  const messageContainerSelector = ".js-replyNewMessageContainer"
  const quickTreadSelector = ".js-quickThreadFields"
  const observeMessage = node => observer.observe(node.querySelector(messageContentSelector), {attributes: true, attributeFilter: ["class"]})
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target.matches(messageContentSelector)) {
        if (mutation.target.classList.contains("is-editing"))
          new MDEditor(mutation.target)
        else
          window.MDEditors[mutation.target.getAttribute("data-md-editor")]?.destroy()
      } else if (mutation.type === "childList") {
        if (mutation.target.matches(messageContainerSelector)) {
          for (const node of mutation.addedNodes)
            observeMessage(node)
          for (const node of mutation.removedNodes)
            observer.unobserve(node.querySelector(messageContentSelector))
        } else if (mutation.target.matches(quickTreadSelector)) {
          console.log(mutation.target.querySelector(".bbWrapper")?.length)
          if (mutation.target.querySelector(".bbWrapper")?.length)
            new MDEditor(mutation.target)
          else
            window.MDEditors[mutation.target.getAttribute("data-md-editor")]?.destroy()
        }
      }
    }
  })
  if (["/conversations/", "/view/"].some(url => location.pathname.startsWith(url) && location.pathname !== url)) {
    for (const container of Array.from(document.querySelectorAll(".js-replyNewMessageContainer"))) {
      observer.observe(container, {childList: true})
      for (const message of Array.from(container.querySelectorAll(`article.message[data-author="${username}"]`)))
        observeMessage(message)
    }
    for (const input of Array.from(document.querySelectorAll(".js-quickReply"))) new MDEditor(input)
  }
  if (location.pathname.startsWith("/pages/")) {
    for (const node of Array.from(document.querySelectorAll(quickTreadSelector)))
      observer.observe(node, {childList: true})
    if (location.pathname.endsWith("/post-thread"))
      new MDEditor(document.querySelector(".js-inlineNewPostFields"))
  }
  if (location.pathname === "/conversations/add")
    new MDEditor(document.querySelector(".formRow--input.formRow--mergePrev"))
}
if (username) pageObserver()
