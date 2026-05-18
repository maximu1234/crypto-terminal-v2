function createAlertObject(chartId, y){

  const id = "alert_" + Date.now();

  const state = getChartState(chartId);

  if(!state.objects){
    state.objects = [];
  }

  state.objects.push({
    id,
    type:"alert",
    y
  });

  saveChartState(chartId, state);

  return id;

}
