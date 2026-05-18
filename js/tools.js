let currentTool = "select";

function setTool(tool){

  currentTool = tool;

  document
    .querySelectorAll(".topbar button")
    .forEach(btn => {
      btn.classList.remove("tool-active");
    });

  const map = {
    select:0,
    hline:1,
    trend:2,
    ray:3
  };

  const buttons = document.querySelectorAll(
    ".left-tools button"
  );

  if(buttons[map[tool]]){
    buttons[map[tool]].classList.add(
      "tool-active"
    );
  }

}
