const xlsxj = require("xlsx-to-json-lc");
const data = require('./output.json');
const fs = require('fs');
const apiKey = 'AIzaSyArUumLPWqO9BG0sh-22fr-9kWPxU5oLPM';
const axios = require('axios');
const async = require('async');
const _ = require('lodash');
const limitDestinations = 25;
let data2 = require('./data/finalData.json');
// const errorData = require('./data/errorDistances.json')
const timeout = 2000;
const vinPoint = '21.034453, 105.760553';

function excelToJson() {
  xlsxj({
    input: "./place_raw.xlsx",
    output: "output.json"
  }, function (err, result) {
    if (err) {
      console.error(err);
    } else {
      console.log(JSON.stringify(result));
    }
  });
}

function modifyData() {
  let data = require('./output.json')
  let promise = new Promise(async (resolve, reject) => {
    let newItem = []
    await data.forEach((item, index) => {
      let pattern = /^(G\d\.\d{2})$/i
      if (!pattern.test(item.place)) {
        newItem.push(item)
      }
    });
    resolve(newItem)
  });
  promise.then((newItem) => {
    saveData([{name: 'fileRemoveTotal.json', data: newItem}])
  })
}

function getLatLong() {
  let data = require('./data/fileRemoveTotal.json')
  let newData = [];
  let errData = [];

  async.each(data, function (item, callback) {
    let url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(item.place + ' Hà Nội') + '&key=' + apiKey;
    console.log(url);
    axios.get(url).then((res) => {
      if (res.data.status === 'OVER_QUERY_LIMIT') {
        res.data.url = url;
      }
      item.geo = res.data;
      newData.push(item);
      callback()
    });
  }, function (err) {
    if (err) {
      console.log('A file failed to process');
    } else {
      saveData([
        {name: 'geoSuccess.json', data: data}
      ])
    }
  });
}

function saveData(files) {
  files.forEach((file) => {
    fs.writeFile('data/' + file.name, JSON.stringify(file.data), function (err) {
      if (err) {
        console.log(file.data);
        return console.log(err);
      }
      console.log('file ' + file.name + ' saved successful');
    });
  })
}

function getDestinations(list) {
  let result = '';
  let listCode = [];
  for (let i = 0; i < list.length; i++) {
    if (!list[i].geo) {
      console.log(list)
    }
    result = result + list[i].geo.results[0].geometry.location.lat + ', ' + list[i].geo.results[0].geometry.location.lng + ' | ';
    listCode.push(list[i].code)
  }
  let patten = /(.\|.)$/;
  result = result.replace(patten, '');
  return {result: result, code: listCode};
}

function getDistances(input) {
  let url = 'http://maps.googleapis.com/maps/api/distancematrix/json?parameters';
  let errFile = [];
  for (let i = 0; i < input.length; i++) {
    setTimeout(function () {
      let item = input[i];
      let index = i;
      let listDestinations = _.without(input, item);
      listDestinations = _.chunk(listDestinations, limitDestinations);
      let origin = item.geo.results[0].geometry.location.lat + ', ' + item.geo.results[0].geometry.location.lng;
      let result = [];
      let errChild = [];
      // console.log(listDestinations)
      async.eachOf(listDestinations, function (child, childIndex, cb) {
        let destinations = getDestinations(child);
        let url = 'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + encodeURIComponent(origin) + '&destinations=' + encodeURIComponent(destinations.result) + '&key=' + apiKey + '&transit_mode=bus';
        axios.get(url).then((res) => {
          if (res) {
            res.data.code = destinations.code;
            if (res.data.status !== 'OK') {
              res.data.url = url;
              console.log('errors');
              errChild.push({url: url, err: res.data.error_message, index: childIndex});
            }
            result.push(res.data);
          }
          cb();
        })
      }, function (err) {
        if (err) {
          console.log('error: ', err.data)
        }
        errFile.push({file: index, list: errChild});
        saveData([{name: 'distances/' + item.code + '.json', data: result}]);
      })
    }, timeout * i)
  }
}

function checkErrReq() {
  let length = data2.length;
  for (let i = 0; i < length; i++) {
    setTimeout(function () {
      let distance = require('./data/distances/' + i + '.json');
      let result = [];
      async.each(distance, function (item, callback) {
        if (item.status === 'OVER_QUERY_LIMIT') {
          axios.get(item.url).then((res) => {
            if (res.data.status !== 'OK') {
              res.data.url = item.url;
              console.log('errors');
              result.push(res.data)
            }
            else {
              console.log('edit data', res.data.status);
              res.data.code = item.code;
              result.push(res.data)
            }
            callback()
          })
        }
        else {
          result.push(item);
          callback()
        }
      }, function () {
        result.forEach(function (item) {
          console.log(item.status)
        });
        saveData([{name: '/distances_edit/' + i + '.json', data: result}])
      })
    }, timeout * i)
  }
}

function modifyDistanceData() {
  let length = data2.length;
  console.log(length)
  for (let i = 0; i < length; i++) {
    let distance = require('./data/distances_edit/' + i + '.json');
    let result = {
      origin: distance[0].origin_addresses[0],
      code: i
    };
    let elements = [];
    for (let j = 0; j < distance.length; j++) {
      let item = distance[j];
      let index = j;
      item.destination_addresses.forEach(function (child, childIndex) {
        if (!item.code) {
          console.log(i)
        }
        elements.push({
          destination: child,
          element: item.rows[0].elements[childIndex],
          code: item.code[childIndex]
        })
      })
    }
    result.elements = elements;
    // console.log(result)
    saveData([{name: '/distances_raw2/' + i + '.json', data: result}])
  }
}

function getDistancesToFinal() {
  async.eachOf(data2, function (item, index, callback) {
    let origin = item.geo.results[0].geometry.location.lat + ', ' + item.geo.results[0].geometry.location.lng;
    let url = 'https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + encodeURIComponent(origin) + '&destinations=' + encodeURIComponent(vinPoint) + '&key=' + apiKey + '&transit_mode=bus';
    axios.get(url).then(function (res) {
      if (res.data.status === 'OK') {
        item.element = res.data;
        item.code = index;
        callback();
      }
      else {
        res.data.url = url;
        item.element = res.data;
        item.code = index;
        callback();
      }
    })
  }, function (err) {
    saveData([{name: 'finalData.json', data: data2}])
  })
}

modifyDistanceData();