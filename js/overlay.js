function initOverlay(chartId){

  const overlay = document.getElementById(
    "overlay_" + chartId
  );

  const svg = overlay.querySelector("svg");

  let drawing = false;

  let startX = 0;
  let startY = 0;

  overlay.addEventListener("mousedown", e => {

    if(currentTool === "select"){
      return;
    }

    drawing = true;

    const rect = overlay.getBoundingClientRect();

    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    if(currentTool === "hline"){

      createHorizontalLine(
        svg,
        chartId,
        startY
      );

    }

    if(
      currentTool === "trend" ||
      currentTool === "ray"
    ){

      createTrendLine(
        svg,
        chartId,
        startX,
        startY,
        currentTool
      );

    }

  });

}

function createHorizontalLine(
  svg,
  chartId,
  y
){

  const line = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );

  line.setAttribute("x1", 0);
  line.setAttribute("x2", "100%");
  line.setAttribute("y1", y);
  line.setAttribute("y2", y);

  line.setAttribute(
    "class",
    "object-line"
  );

  svg.appendChild(line);

  persistObject(chartId,{
    type:"hline",
    y
  });

}

function createTrendLine(
  svg,
  chartId,
  x,
  y,
  mode
){

  const line = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  );

  line.setAttribute("x1", x);
  line.setAttribute("y1", y);

  line.setAttribute("x2", x + 120);
  line.setAttribute("y2", y - 80);

  line.setAttribute(
    "class",
    "object-line"
  );

  svg.appendChild(line);

  persistObject(chartId,{
    type:mode,
    x1:x,
    y1:y,
    x2:x + 120,
    y2:y - 80
  });

}

function persistObject(chartId,obj){

  const state = getChartState(chartId);

  if(!state.objects){
    state.objects = [];
  }

  state.objects.push(obj);

  saveChartState(chartId,state);

}

function restoreObjects(chartId){

  const state = getChartState(chartId);

  if(!state.objects){
    return;
  }

  const svg = document.querySelector(
    "#overlay_" + chartId + " svg"
  );

  state.objects.forEach(obj => {

    if(obj.type === "hline"){

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );

      line.setAttribute("x1",0);
      line.setAttribute("x2","100%");

      line.setAttribute("y1",obj.y);
      line.setAttribute("y2",obj.y);

      line.setAttribute(
        "class",
        "object-line"
      );

      svg.appendChild(line);

    }

    if(
      obj.type === "trend" ||
      obj.type === "ray"
    ){

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );

      line.setAttribute("x1",obj.x1);
      line.setAttribute("y1",obj.y1);

      line.setAttribute("x2",obj.x2);
      line.setAttribute("y2",obj.y2);

      line.setAttribute(
        "class",
        "object-line"
      );

      svg.appendChild(line);

    }

  });

}
