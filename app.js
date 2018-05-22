const fs = require('fs');
const _ = require('lodash');
const data = require('./data/finalData.json');
const buses = [29, 16, 7];
const maxTime = 3600;

// sort theo khoang cach lon nhat
let input = _.sortBy(data, [function (o) {
  return o.element.rows[0].elements[0].duration.value;
}]);

let output = [];

// nhung dia chi da su dung
let donePlace = [];

while (input.length === donePlace.length) {
  let donePlaceChild = []; // danh sach dia diem da xong trong route hien tai
  donePlaceChild = donePlace.slice();
  let route = {
    element: [],
    duration: 0,
    distance: 0,
    child: [],
    bus: 0
  };
  let lastPlaceIndex = input.length - 1;

  // lay vi tri xa nhat
  let lastPlace = input[lastPlaceIndex];
  let bus = buses[0];

  // neu so hs lon hon xe
  if (lastPlace.count >= bus) {

  }
  else {
    route.element.push({
      place: lastPlace.place,
      index: lastPlace.code,
      geo: lastPlace.geo.results[0].formatted_address
    });
    bus -= lastPlace.count;
    input.splice(lastPlaceIndex, 1);
    donePlace.push(lastPlace.code);
    donePlaceChild.push(lastPlace.code)
  }

  let breakPoint = false;

  //  khi bus chua day hoac chua qua time toi da
  while (bus >= 1 && input.length === donePlaceChild.length && !breakPoint) {

    // lay danh sach khoang cach tu diem cuoi toi cac diem khac
    let distances = require('./data/distances_raw2/' + route.element[route.element.length-1].index + '.json');
    let distancesLength = distances.elements.length;
    let distancesRaw = []; // danh sach khoang cach sau khi xoa nhung dia diem da chon

    // xoa nhung dia diem da dc su dung
    for (let i=0; i<distancesLength; i++) {
      if (donePlace.indexOf(distances.elements[i].code) === -1 && donePlaceChild.indexOf(distances.elements[i].code) === -1) {
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
      let nearestPlaceRaw = _.find(input, function (o) {
        return o.code === nearestPlace.code;
      });

      // kiem tra thoi gian tong < thoi gian yeu cau
      let newTime = route.duration + nearestPlace.element.duration.value + nearestPlaceRaw.element.rows[0].elements[0].duration.value;
      if (newTime < maxTime) {
        route.child.push(nearestPlace);
        route.duration += nearestPlace.element.duration.value;
        route.distance += nearestPlace.element.distance.value;

        donePlaceChild.push(nearestPlaceRaw.code);

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
}