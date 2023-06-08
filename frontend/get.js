

function get(){
    console.log("get btn pressed");
}

async function logJSONData() {
    const res = await fetch("http://raspberry:3000/get-state")
    const names = await res.json();
    return names.data;
}

async function postData(data, name){
    const res = await fetch("http://raspberry:3000/set-state", {
        method: "POST",
        mode: 'cors',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ "adc_val": data}),
    }).then((response)=>response.json())
    .then((responseJson)=>{console.log(responseJson)});
}