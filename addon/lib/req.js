const { Request } = require("sdk/request");
const user = require("./user");

exports.request = function (url, options) {
  options.method = options.method || "get";
  options.method = options.method.toLowerCase();
  if (typeof options.expectedStatus === "string") {
    options.expectedStatus = [options.expectedStatus];
  }
  return new Promise((resolve, reject) => {
    if ((! options.ignoreLogin) && (! user.isInitialized())) {
      return retryPromise(
        function () {
          return user.initialize();
        },
        3
      ).then(function () {
        return exports.request(url, options).then(resolve, reject);
      },
      reject);
    }
    let requester = Request({
      url: url,
      content: options.content,
      contentType: options.contentType,
      onComplete: function (response) {
        if (options.expectedStatus && options.expectedStatus.indexOf(response.status) === -1) {
          reject(response);
        } else {
          resolve(response);
        }
      }
    });
    requester[options.method]();
  });
};

exports.sendEvent = function (event /* optional, default "addon" */, action, label) {
  if (label === undefined) {
    label = action;
    action = event;
    event = "addon";
  }
  let main = require("./main");
  exports.request(`${main.getBackend()}/event`, {
    method: "POST",
    content: JSON.stringify({event, action, label}),
    contentType: "application/json"
  });
};

exports.sendTiming = function(event, action, timing) {
  let main = require("./main");
  exports.request(`${main.getBackend()}/timing`, {
    method: "POST",
    content: JSON.stringify({event, action, timing}),
    contentType: "application/json"
  });
};

function timeout(time) {
  return new Promise((resolve, reject) => {
    require("sdk/timers").setTimeout(function () {
      resolve();
    }, time);
  });
}

function retryPromise(callback, times, retryTime) {
  if (retryTime === undefined || retryTime === null) {
    retryTime = 1000;
  }
  return callback().then(
    (result) => {
      return result;
    },
    (error) => {
      if (times <= 0) {
        throw error;
      } else {
        return timeout(retryTime).then(() => {
          return retryPromise(callback, times-1);
        });
      }
    }
  );
}
