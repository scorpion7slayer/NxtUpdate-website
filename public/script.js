function copyWithFallback(value) {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  const ok = document.execCommand("copy");
  field.remove();
  return ok;
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return copyWithFallback(value);
    }
  }
  return copyWithFallback(value);
}

document.querySelectorAll(".copy").forEach((button) => {
  button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy");
    const status = document.querySelector("#copy-status");
    if (!value) return;

    const previous = button.textContent;
    const ok = await copyText(value);
    button.textContent = ok ? "copied" : "copy failed";
    button.classList.toggle("is-copied", ok);
    if (status) {
      status.textContent = ok
        ? `Copied: ${value}`
        : `Could not copy: ${value}`;
    }
    window.setTimeout(() => {
      button.textContent = previous;
      button.classList.remove("is-copied");
      if (status) status.textContent = "";
    }, 1600);
  });
});
