var options = [
  {
    display: 'Shortcut (keycode)',
    id: 'shortcut',
    default: 90,
    type: 'number'
  },
  {
    display: 'Show overlay',
    id: 'create_overlay',
    default: true,
    type: 'checkbox'
  },
  {
    display: 'Transition time (seconds)',
    id: 'transition_speed',
    default: 0.3,
    type: 'number'
  },
  {
    display: 'Transition Easing (see http://easings.net)',
    id: 'transition_easing',
    default: 'ease',
    type: 'text'
  },
  {
    display: 'Horizontal position (%)',
    id: 'css_transform_origin_X',
    default: 50,
    type: 'number'
  }
];

// Saves options to chrome.storage.sync.
function saveOptions(valuesHash) {
  chrome.storage.sync.set(
    valuesHash,
    function() {
      // Update status to let user know options were saved.
      var status = document.querySelector('#status');
      status.innerHTML = 'Options saved';
      setTimeout(function() {
        status.innerHTML = '&nbsp;';
      }, 2000);
    }
  );
}

function getValueType(type) {
  if (type === 'checkbox') {
    return 'checked';
  } else {
    return 'value';
  }
}

function getValueAttr(type, value) {
  if (type === 'checkbox' && !value) {
    return '';
  }
  return getValueType(type) + '="' + value + '"';
}

function createNodeFromString(str) {
  var div = document.createElement('div');
  div.innerHTML = str;
  return div.firstChild;
}

function loadOptions() {
  chrome.storage.sync.get(
    // Generate hash of default values
    options.reduce(function(memo, option) {
      memo[option.id] = option.default;
      return memo;
    }, {}),
    function(items) {
      var containerEl = document.querySelector('#container');

      options.forEach(function createOption(option) {
        var html;
        var valueAttr = getValueAttr(option.type, items[option.id]);
        var element = containerEl.querySelector('#' + option.id);
        if (element) {
          element[getValueType(option.type)] = items[option.id];
        } else {
          html = '<label><input type="' + option.type + '" id="' + option.id + '" ' + valueAttr + '>' + option.display + '</label>';

          containerEl.appendChild(createNodeFromString(html));
        }
      });
    }
  );
}

document.getElementById('save').addEventListener('click', function() {
  var valuesHash = options.reduce(function(memo, option) {
    memo[option.id] = document.querySelector('#' + option.id)[getValueType(option.type)];
    return memo;
  }, {});
  saveOptions(valuesHash);
});

document.getElementById('defaults').addEventListener('click', function() {
  var valuesHash = options.reduce(function(memo, option) {
    memo[option.id] = option.default;
    return memo;
  }, {});
  saveOptions(valuesHash);
  loadOptions();
});

loadOptions();
