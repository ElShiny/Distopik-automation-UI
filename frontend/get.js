

function get(){
    console.log("get btn pressed");
}

async function logJSONData() {
    const res = await fetch("http://raspberry:3000/get-state")
    const names = await res.json();
    return names.data[2].adc_val;

  }