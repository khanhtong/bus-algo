let data = require('./data/finalData.json');

for (let i=0; i<117; i++){
  data[i].count ++ ;
}
console.log(JSON.stringify(data))

let c = 0;
for (let i=0; i<data.length; i++){
  c += data[i].count ;
}

console.log(c)