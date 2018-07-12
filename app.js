const fs = require('fs');
const perf = require('execution-time')();
const Json2csvParser = require('json2csv').Parser;
const _ = require('lodash');
const data = require('./data/finalData.json');
const buses = [29, 16, 7]; // danh sach cac loai xe su dung
const maxTime = 3600; // thoi gian toi da cua 1 xe
const bufferTime = 1.2; // thoi gian buffer khoang cach tinh bang google map
const timeForPickup = 60; // thoi gian dung lai de don hoc sinh
const largeTime = 1.5; // khoang cach toi da cua 1 diem khi di thang so voi di tuyen
const minTime = 1200;
let timeToArrived2 = '7h20';
let timeToArrived = '7h40';
const timeBetweenEachArrived = 5;

function checkCondition(route, place, nextDistance) {
  // kiem tra thoi gian tong < thoi gian yeu cau
  let newTime = route.duration
    + nextDistance.element.duration.value * bufferTime
    + place.element.rows[0].elements[0].duration.value * bufferTime;
  if (newTime < maxTime) {
    if (newTime > minTime) {
      // check tung diem khong vuot qua yeu cau
      for (let i = 0; i < route.element.length; i++) {
        let rs = newTime;
        for (let j = 0; j < i; j++) {
          rs = rs - (route.child[j].element.duration.value * bufferTime + timeForPickup);
        }
        route.element[i].bufferDuration = rs;
        if ((rs) > (route.element[i].durationToScore * bufferTime) * largeTime) {
          return false;
        }
      }
      return true;
    }
    else {
      return true;
    }
  }
  else return false;
}

function main() {
  perf.start();
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
      route.count = bus;
      lastPlace.count -= bus;
      bus = 0;
      route.element.push({
        place: lastPlace.place,
        index: lastPlace.code,
        geo: lastPlace.geo.results[0].formatted_address,
        count: route.count,
        durationToScore: lastPlace.element.rows[0].elements[0].duration.value
      });
      route.duration += timeForPickup;
    }
    else {
      route.element.push({
        place: lastPlace.place,
        index: lastPlace.code,
        geo: lastPlace.geo.results[0].formatted_address,
        count: lastPlace.count,
        durationToScore: lastPlace.element.rows[0].elements[0].duration.value
      });
      route.duration += timeForPickup;
      route.count += lastPlace.count;
      bus -= lastPlace.count;
      donePlace.push(lastPlace.code);
      donePlaceChild.push(lastPlace.code)
    }

    let breakPoint = false;

    //  khi bus chua day hoac chua qua time toi da
    while (bus >= 1 && input.length > donePlaceChild.length && !breakPoint) {

      // lay danh sach khoang cach tu diem cuoi toi cac diem khac
      let distances = require('./data/distances_raw3/' + route.element[route.element.length - 1].index + '.json');
      let distancesLength = distances.elements.length;
      let distancesRaw = []; // danh sach khoang cach sau khi xoa nhung dia diem da chon

      // xoa nhung dia diem da dc su dung
      for (let i = 0; i < distancesLength; i++) {
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
        let nearestPlaceRaw = _.find(inputRaw, function (o) {
          return o.code === nearestPlace.code;
        });
        // kiem tra thoi gian khong vuot cho moi diem
        let cd = checkCondition(route, nearestPlaceRaw, nearestPlace);

        if (cd) {
          // so luong nguoi tai diem nho hon so ghe con lai cua xe
          if (bus >= nearestPlaceRaw.count) {
            route.child.push(nearestPlace);
            route.duration = route.duration + timeForPickup + nearestPlace.element.duration.value * bufferTime;
            route.distance += nearestPlace.element.distance.value;

            donePlaceChild.push(nearestPlaceRaw.code);

            route.count += nearestPlaceRaw.count;
            bus -= nearestPlaceRaw.count;
            donePlace.push(nearestPlaceRaw.code);
            route.element.push({
              place: nearestPlaceRaw.place,
              index: nearestPlaceRaw.code,
              geo: nearestPlaceRaw.geo.results[0].formatted_address,
              count: nearestPlaceRaw.count,
              durationToScore: nearestPlaceRaw.element.rows[0].elements[0].duration.value
            });
          }
          else {
            donePlaceChild.push(nearestPlaceRaw.code);
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
    for (let i = 0; i < buses.length; i++) {
      if (route.count <= buses[i]) {
        route.type = i;
      }
    }
    route.bus = buses[route.type] - route.count;
    let lastItem = _.last(route.element);
    let lastItemRaw = _.find(input, function (o) {
      return o.code === lastItem.index
    });
    route.distance += lastItemRaw.element.rows[0].elements[0].distance.value;
    route.duration += lastItemRaw.element.rows[0].elements[0].duration.value;
    route.distance = route.distance / 1000;
    route.duration = route.duration / 60;
    route.child.push({
      destination: lastItemRaw.element.destination_addresses[0],
      element: {
        distance: lastItemRaw.element.rows[0].elements[0].distance,
        duration: lastItemRaw.element.rows[0].elements[0].duration
      }
    });
    output.push(route)
  }


  // formnat
  let resBus = [];
  for (let i = 0; i < buses.length; i++) {
    resBus.push({
      value: buses[i],
      count: 0
    })
  }
  // count number of bus
  for (let i = 0; i < output.length; i++) {
    resBus[output[i].type].count++;
  }
  output = _.sortBy(output, [function (o) {
    return o.duration;
  }]);
  setTime(output);
  console.log(JSON.stringify(output));
  // format data to export excel
  for (let i = 0; i < output.length; i++) {
    for (let j = 0; j < output[i].child.length; j++) {
      if (!output[i].child[j].element) {
        console.log(output[i].child[j])
      }
      output[i].child[j] = {
        distance: output[i].child[j].element.distance.text,
        duration: output[i].child[j].element.duration.text,
        place: output[i].element[j].place,
        count: output[i].element[j].count,
        geo: output[i].element[j].geo,
        index: output[i].element[j].index,
      }
    }
  }

  console.log(resBus);
  console.log(JSON.stringify(output));
  console.log('Number of bus: ', output.length);
  const results = perf.stop();
  console.log('Time: ', results.time);
  // exportCsv(output)
}

function setTime(output) {
  // format time;
  timeToArrived = timeToArrived.split('h');
  timeToArrived2 = timeToArrived2.split('h');
  timeToArrived[0] = Number(timeToArrived[0]);
  timeToArrived[1] = Number(timeToArrived[1]);
  timeToArrived2[0] = Number(timeToArrived2[0]);
  timeToArrived2[1] = Number(timeToArrived2[1]);
  let totalTimeArrived = timeToArrived[0] * 60 + timeToArrived[1] - timeToArrived2[0] * 60 - timeToArrived2[1];

  // set time arrived for each bus
  let numberOfTurn = totalTimeArrived / timeBetweenEachArrived + 1;
  let numberOfBusPerTurn = Math.floor(output.length / numberOfTurn);
  let tmp = 0;
  let timePlus = 0;
  for (let j = output.length - 1; j >= 0; j--) {
    let route = output[j];
    if (tmp < numberOfBusPerTurn) {
      tmp++;
    }
    else {
      tmp = 0;
      timePlus += timeBetweenEachArrived;
    }
    let arrivedTime = calTime(timeToArrived2, timePlus);
    route.arrivedTime = arrivedTime;
    // set time for each place of a bus
    for (let k = 0; k < route.element.length; k++) {
      let element = route.element[k];
      let rs = element.bufferDuration / 60; // thoi gian di tu diem toi truong theo minutes
      if (k === route.element.length -1) {
        rs = element.durationToScore / 60
      }
      let tmpTime = calTime(route.arrivedTime, 0-rs);
      element.timeStart = tmpTime[0] + 'h' + tmpTime[1];
    }

  }
}

function calTime(a, b) {
  let m = a[1] + b;
  let h = a[0];
  if (m > 60) {
    m = m % 60;
    h += Math.floor(m / 60);
  }
  if (m < 0) {
    m = 60 + (m % 60);
    h = h + Math.floor(m/60) - 1;
  }

  return [h, Math.floor(m)];
}

function exportCsv(output) {
  const fields = [
    {
      label: 'Code',
      value: 'child.index'
    },
    {
      label: 'Địa điểm input',
      value: 'child.place'
    },
    {
      label: 'Số người đón tại điểm',
      value: 'child.count'
    },
    {
      label: 'Khoảng cách tới chặng kế',
      value: 'child.distance'
    },
    {
      label: 'Thời gian tới chặng kế',
      value: 'child.duration'
    },
    {
      label: 'Tổng khoảng cách',
      value: 'distance'
    },
    {
      label: 'Tổng thời gian',
      value: 'duration'
    },
    {
      label: 'Số lượng ghế còn lại',
      value: 'bus'
    },
    {
      label: 'Số người đón',
      value: 'count'
    },
    {
      label: 'Loại xe',
      value: 'type'
    }
  ];
  const json2csvParser = new Json2csvParser({fields, unwind: ['element', 'child'], unwindBlank: true});
  const csv = json2csvParser.parse(output);
  fs.writeFile('output/10%Buffer60sDelay2.csv', "\uFEFF" + csv, 'utf8', function (err) {
    console.log('err: ', err);
  });
}

main();
