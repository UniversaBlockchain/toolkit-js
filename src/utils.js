const fs = require('fs');

async function retry(fn, options = {}) {
  const attempts = options.attempts || 5;
  const interval = options.interval || 1000;
  const exponential = options.exponential || false;
  const onError = options.onError;

  try {
    const val = await fn();

    return val;
  } catch (error) {
    if (onError) onError(error);

    if (attempts) {
      await new Promise(r => setTimeout(r, interval));

      return retry(fn, {
        attempts: attempts - 1,
        interval: exponential ? interval * 2 : interval,
        exponential
      });
    } else throw new Error('Maximum attempts reached');
  }
}

function abortable(responsePromise, request) {
  responsePromise.abort = () => {
    request && request.abort();
  }

  return responsePromise;
}

function readJSON(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) reject(err);
      else resolve(JSON.parse(data));
    });
  });
}

exports.readJSON = readJSON;
exports.retry = retry;
exports.abortable = abortable;
