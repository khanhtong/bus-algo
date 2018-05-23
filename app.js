const fs = require('fs');
const _ = require('lodash');
const data = require('./data/test.json');
const buses = [29, 16, 7];
const maxTime = 3600;

// sort theo khoang cach lon nhat
let input = _.sortBy(data, [function (o) {
  return o.element.rows[0].elements[0].duration.value;
}]);

let output = [];

// nhung dia chi da su dung
let donePlace = [];

while (input.length > donePlace.length) {
  let donePlaceChild = []; // danh sach dia diem da xong trong route hien tai
  donePlaceChild = donePlace.slice();
  let route = {
    element: [],
    duration: 0,
    distance: 0,
    child: [],
    bus: 0,
    count: 0
  };

  let inputRaw = [];
  for (let i = 0; i < input.length; i++) {
    if (donePlace.indexOf(input[i].code) === -1) {
      inputRaw.push(input[i])
    }
  }
  let lastPlaceIndex = inputRaw.length - 1;

  // lay vi tri xa nhat
  let lastPlace = inputRaw[lastPlaceIndex];
  let bus = buses[0];

  // neu so hs lon hon xe
  if (lastPlace.count >= bus) {

  }
  else {
    route.element.push({
      place: lastPlace.place,
      index: lastPlace.code,
      geo: lastPlace.geo.results[0].formatted_address,
      count: lastPlace.count
    });
    route.count += lastPlace.count
    bus -= lastPlace.count;
    donePlace.push(lastPlace.code);
    donePlaceChild.push(lastPlace.code)
  }

  let breakPoint = false;

  //  khi bus chua day hoac chua qua time toi da
  while (bus >= 1 && input.length > donePlaceChild.length && !breakPoint) {

    // lay danh sach khoang cach tu diem cuoi toi cac diem khac
    let distances = require('./data/distances_raw2/' + route.element[route.element.length - 1].index + '.json');
    let distancesLength = distances.elements.length;
    let distancesRaw = []; // danh sach khoang cach sau khi xoa nhung dia diem da chon

    // xoa nhung dia diem da dc su dung
    for (let i = 0; i < distancesLength; i++) {
      if (donePlace.indexOf(distances.elements[i].code) === -1 && donePlaceChild.indexOf(distances.elements[i].code) === -1 && distances.elements[i].code !== 143) {
        distancesRaw.push(distances.elements[i])
      }
    }

    // khi van con dia diem co the chon
    if (distancesRaw.length > 0) {
      // tim khoang cach ngan nhat
      let nearestPlace = _.minBy(distancesRaw, function (o) {
        return o.element.duration.value;
      });
      // tim dia diem tu khoang cach ngan nhat
      let nearestPlaceRaw = _.find(inputRaw, function (o) {
        return o.code === nearestPlace.code;
      });

      if (!nearestPlaceRaw) {
        console.log(nearestPlaceRaw)
        console.log(nearestPlace)
        console.log(JSON.stringify(inputRaw))
      }
      // kiem tra thoi gian tong < thoi gian yeu cau
      let newTime = route.duration
        + nearestPlace.element.duration.value
        + nearestPlace.element.duration.value*20/100
        + nearestPlaceRaw.element.rows[0].elements[0].duration.value
        + nearestPlaceRaw.element.rows[0].elements[0].duration.value*20/100;
      if (newTime < maxTime) {
        route.child.push(nearestPlace);
        route.duration += nearestPlace.element.duration.value;
        route.distance += nearestPlace.element.distance.value;

        donePlaceChild.push(nearestPlaceRaw.code);
        route.element.push({
          place: nearestPlaceRaw.place,
          index: nearestPlaceRaw.code,
          geo: nearestPlaceRaw.geo.results[0].formatted_address,
          count: nearestPlaceRaw.count
        });
        route.count += nearestPlaceRaw.count;
        // so luong nguoi tai diem nho hon so ghe con lai cua xe
        if (bus >= nearestPlaceRaw.count) {
          bus -= nearestPlaceRaw.count;
          donePlace.push(nearestPlaceRaw.code);
        }
        else {
          nearestPlaceRaw.count -= bus;
          bus = 0;
          donePlaceChild.push(nearestPlaceRaw.code)
        }

      }
      else {
        breakPoint = true;
      }
    }
    else {
      breakPoint = true;
    }
  }
  if (route.count <= buses[1]) {
    route.bus = 1;
  }
  if (route.count <= buses[2]) {
    route.bus = 2;
  }
  let lastItem = _.last(route.element);
  let lastItemRaw = _.find(input, function (o) {
    return o.code === lastItem.index
  });
  route.distance += lastItemRaw.element.rows[0].elements[0].distance.value;
  route.duration += lastItemRaw.element.rows[0].elements[0].duration.value;
  output.push(route)
}

console.log(JSON.stringify(output));
console.log(output.length);


let a = {
  "0": 0,
  "1": 0,
  "2": 0
}
for (let i = 0; i<output.length; i++) {
  if (output[i].bus === 0) {
    a["0"] ++
  }
  if (output[i].bus ===  1) {
    a["1"] ++
  }
  if (output[i].bus === 2) {
    a["2"] ++
  }
}

console.log(a)
// let countAll = 0;
// output.forEach((item) => {
//   countAll += item.count;
// })
//
// setTimeout((function () {
//   console.log(countAll)
// }), 1000)