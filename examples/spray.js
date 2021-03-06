let g = new sigma({ // eslint-disable-line
  renderer: {
    container: 'graph',
    type: 'canvas'
  },
  settings: Object.assign(sigma.settings, {
    defaultEdgeType: 'curvedArrow',
    minArrowSize: 10,
    scalingMode: 'inside',
    sideMargin: 0.5
  }) // eslint-disable-line
}) // eslint-disable-line
localStorage.debug = 'spray-wrtc, spa'
let Spray = spray
let revertedIndex = new Map()
const max = 12
const mod = 4
const room = Math.floor(Math.random() * max)
const spray_a = 1
const spray_b = 2
const delta = 100000000000
const realDelta = 30000
const connection = 2000
const moc = false
const timeout = 5 * 1000
const iceServers = []
// const iceServers = [{
//   url: 'stun:127.0.0.1:3478'
// }]
// const iceServers = [{
//   urls: "turn:localhost:3478?transport=udp",
//   username: "username",
//   credential: "password"
// }]
document.getElementById("theoretical").innerHTML = ""+ (max* (spray_a*Math.log(max) + spray_b))
let apps = []
init(0)
init(1)
if(max < 2) throw new Error('need to have at least 2 peers')

apps[0].connect(apps[1]).then(() => {
  for(let i = 2; i<(max); i++) {
    init(i)
  }
  g.refresh()
  const loaded = [apps[0], apps[1]]
  const tmp = apps.slice(2)
  ebSync(loaded).then(() => {
    tmp.reduce((acc, spray) => acc.then(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          chosen = Math.floor(Math.random() * loaded.length)
          // const average = loaded.map(p => p.getNeighbours().reduce((a, c) => a + c.peer.occurences, 0)).reduce((a , c) => a + c, 0) / loaded.length
          // const arr = loaded.map(p => p.getNeighbours().reduce((a, c) => a + c.peer.occurences, 0))
          // chosen = arr.indexOf(closest(average, arr))
          // console.log('Average = ', average, loaded[chosen].id)
          spray.connect(loaded[chosen]).then(() => {
            setTimeout(() => {
              ebAsync(loaded).then(() => {
                resolve()
              })
            }, connection)
          })
        }, connection)
      })
    }), Promise.resolve()).then(() => {
      // init(3)
      // apps[3].connect(apps[1])
      update()
      setTimeout(() => {
        shuffle(delta)
      }, delta)
    })
  })
})

function init (i) {
  const spray = createApp('C-' + i)
  apps.push(spray)
  g.graph.addNode({
    'id': spray.id,
    'firstLabel': spray.id,
    'label': spray.id,
    'x': i % mod,
    'y': Math.floor(i / mod),
    'size': 2,
    color: randomColor()
  })
  spray.on('out', (peerId) => {
    // console.log('[%s] out: ', spray.id, peerId)
    setTimeout(() => {
      if (!g.graph.edges(spray.id + peerId)) {
        g.graph.addEdge({
          id: spray.id + peerId,
          source: spray.id,
          target: peerId
        })
        g.refresh()
      }
    }, 500)
  })
  spray.on('close_out', (peerId, fail) => {
    // console.log('[%s] close_out: %s fail: %s', spray.id, peerId, fail)
    if (g.graph.edges(spray.id + peerId)) {
      g.graph.dropEdge(spray.id + peerId)
      g.refresh()
    }
  })
  spray.on('close_in', (peerId, fail) => {
    // console.log('[%s] close_in: %s fail: %s', spray.id, peerId, fail)
    check()
  })
  spray.on('receive', (id, message) => {
    console.log('[%s] message receive from %s ', spray.id, id, message)
  })
}

function shuffle (delta) {
  console.log('begin round: ', r)
  return ebAsync(apps, 10000).then(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve()
      }, delta)
    }).then(() => {
      return shuffle(delta)
    })
  })
}

setInterval(() => {
  update(false)
}, 2000)

function createApp(id) {
  console.log('Create Spray client: ', id)
  return new Spray({
    spray: {
      a: spray_a,
      b: spray_b,
      delta: realDelta,
      timeout,
    },
    n2n: {
      id,
      timeout
    },
    socket: {
      trickle: true,
      config: {
        iceServers
      },
      moc
    },
    signaling: {
      room: 'spray-wrtc' + room
    }
  })
}
// var ctx = document.getElementById("myChart")
// var myChart = new Chart(ctx, {
//     type: 'line',
//     data: {
//         labels: ["arcs"],
//         datasets: [{
//             label: '#Arcs',
//             data: []
//         }]
//     },
//     options: {
//         scales: {
//             yAxes: [{
//                 ticks: {
//                     beginAtZero:true
//                 }
//             }]
//         }
//     }
// })
// let r = 0


function addData(chart, label, data) {
    chart.data.labels.push(label)
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(data)
    })
    chart.update()
}

let scramblecount = 0
let scramble = (delay = 0) => {
    scramblecount++
    for (let i = 0; i < max; ++i) {
        setTimeout ( (nth) => {
            apps[nth]._exchange() // force exchange
            if(i === max-1) {
              const average = apps.reduce((acc, cur) => acc+cur.getNeighbours(true).length, 0) / apps.length
              console.log('Round: %f, averagepv=%f', scramblecount, average)
            }
        }, i*delay, i)
    }
}


function neigh() {
  apps.forEach(c => {
    console.log(c.getNeighbours())
  })
}

function closest (num, arr) {
  return arr.reduce(function(prev, curr, index) {
    return (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev);
  })
}
function randomColor () {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 3; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

function ebAsync (tab, time = 5000) {
  let res = []
  tab.forEach(p => {
    res.push(p._exchange().then(() => {
      return Promise.resolve()
    }))
  })
  return Promise.all(res).then(() => {
    setTimeout(() => {
      // log()
      update()
    }, time)
  })
}

function log () {
  apps.forEach(p => {
    console.log('[%s] Living Inview', p.id, p.livingInview)
    console.log('[%s] Pending Inview', p.id, p.pendingInview)
    if(p.pendingInview.size > 0) {
      console.log('PENDING INVIEW IS NOT EMPTY!')
    }
    console.log('[%s] Living outview', p.id, p.livingOutview)
    console.log('[%s] Pending outview', p.id, p.pendingOutview)
    if(p.pendingOutview.size > 0) {
      console.log('PENDING OUTVIEW IS NOT EMPTY!')
    }
  })
}

function update(add = true) {
  const withoutduplicates = apps.reduce((acc, cur) => acc+cur.livingOutview.size, 0)
  const numberofduplicates = apps.reduce((acc, cur) => {
    const occ = cur.getNeighbours().reduce((acc, c) => {
      // console.log('from %s to %s, occ: %f', cur.id, c.id, c.peer.occurences)
      return acc + c.peer.occurences - 1
    }, 0)
    const total = acc + occ
    // console.log('total of duplicates: %f for peer %s', total, cur.id, total)
    return total
  }, 0)
  const pv = apps.reduce((acc, cur) => acc+cur.livingOutview.size, 0)/apps.length
  document.getElementById("actualdup").innerHTML = ""+ numberofduplicates
  document.getElementById("actualwodup").innerHTML = ""+ withoutduplicates
  document.getElementById("actualarcs").innerHTML = ""+ (numberofduplicates + withoutduplicates)
  document.getElementById("actualpourcentage").innerHTML = ""+ numberofduplicates / (numberofduplicates+withoutduplicates) * 100 + '%'
  document.getElementById("pv").innerHTML = ""+ pv + " / "+ (spray_a*Math.log(max) + spray_b)
  g.refresh()
  if(add) {
    // // Any of the following formats may be used
    // addData(myChart, "Round "+r, {x: r, y:numberofduplicates+withoutduplicates})
    // r++
  }
}

function ebSync(tab) {
  return tab.reduce((acc, cur) => acc.then(() => {
    return new Promise((resolve, reject) => {
      cur._exchange().then(() => {
        resolve()
      }).catch(e => {
        reject(e)
      })
    })
  }), Promise.resolve()).then((res) => {
    // console.log('Exchange sync finished', res)
    setTimeout(() => {
      update()
    }, 5000)
    return Promise.resolve()
  }).catch(e => {
    console.error(e)
    return Promise.reject(e)
  })
}

function checkTURNServer (config, timeout) {
  return new Promise(function(resolve, reject){
    setTimeout(function(){
        if(promiseResolved) return;
        resolve(false);
        promiseResolved = true;
    }, timeout || 5000);
    var promiseResolved = false
      , myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection   //compatibility for firefox and chrome
      , pc = new myPeerConnection({iceServers:[config]})
      , noop = function(){};
    pc.createDataChannel("test");    //create a bogus data channel
    pc.createOffer(function(sdp){
      if(sdp.sdp.indexOf('typ relay') > -1){ // sometimes sdp contains the ice candidates...
        promiseResolved = true;
        resolve(true);
      }
      pc.setLocalDescription(sdp, noop, noop);
    }, noop);    // create offer and set local description
    pc.onicecandidate = function(ice){  //listen for candidate events
      if(promiseResolved || !ice || !ice.candidate || !ice.candidate.candidate || !(ice.candidate.candidate.indexOf('typ relay')>-1))  return;
      promiseResolved = true;
      resolve(true);
    };
  });
}

function testIces() {
  iceServers.forEach(ice => {
    checkTURNServer(ice, 1000).then((res) => {
      console.log('Ice:', ice, ' Working?', res)
    })
  })
}

function check () {
  const all = apps.map(p => p.getNeighbours().map(peer => apps[Number((peer.id).substr(2))].livingInview.has(p.id)))
  const status = all.map(p => p.reduce((a, c) => a && c, true)).reduce((a, c) => a && c, true)
  if (!status)
    console.warn('Status: ', status)
}

function estimate(app) {
  const pvSize = app.livingOutview.size
  const neighbourSize = [...app.livingOutview.keys()].map(i => {
    return apps.find(e => e.id === i).livingOutview.size
  }).reduce((acc, cur) => acc + cur, 0)
  const bis = (pvSize + neighbourSize) / (pvSize + 1)
  return {
    id: app.id,
    average: Math.exp(bis)
  }
}

function estimatorSimple() {
  console.log(apps.map(p => estimate(p)))
}

function estimatorComplexe() {
  const average = apps.map(p => estimate(p))
  const neighbourAverage = average.map((av, index) => {
    return [...apps[index].livingOutview.keys()].map((id, ind) => {
      return average.find(e => e.id === id).average
    })
  }).map(arr => {
    // compute average on average
    return arr.reduce((acc, cur) => acc + cur, 0) / arr.length
  })
  return neighbourAverage

}
