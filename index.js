var WikiBot = require('nodemw');
var Promise = require('bluebird');
var axios = require('axios');
var urlencode = require('urlencode');
var Random = require('random-js');

var getPageViews = function(collector, page) {
  var delay = collector.getRandomDelay();
  console.log('Gettings satats for page %s, delay: %d', page.title, delay);
  return Promise.delay(delay).
  then(function() {
    return axios.get(collector.statsEndpoint + urlencode(page.title))
  })
  .then(function(response) {
    console.log('Stats response for page %s: %s', page.title, response.statusText);
    var views = response.data;

    var dailyViews = [];
    for (var date in views.daily_views) {
      dailyViews.push(views.daily_views[date]);
    }

    var totalViews = dailyViews
    .slice(-collector.statsPeriod)
    .reduce(function(a, b) {return a + b;});

    page.views = totalViews;
    return Promise.resolve({
      title: page.title,
      views: totalViews,
      categories: page.categories
    });
  });
};

var getPageViewsInCategory = function(collector, category) {
  console.log('Gettings satats for category %s', category.title);
  return collector.getPagesInCategory(category.title)
  .then(function(results) {

    var pageCategories = category.categories.slice();
    pageCategories.push(category.title);

    var pages = [];
    var subcategories = [];

    results.forEach(function(page) {
      page.categories = pageCategories;
      if (page.ns === 0) {
        pages.push(page);
      } else if (page.ns === 14) {
        page.title = page.title.split(':')[1];
        subcategories.push(page);
      }
    });

    console.info('Category: %s - pages: %d, subcategories %d',
      category.title, pages.length, subcategories.length);

    var pagePromises = [];
    pages.forEach(function(page) {
      pagePromises.push(getPageViews(collector, page));
    });

    var subcategoryPromises = [];
    subcategories.forEach(function(page) {
      subcategoryPromises.push(getPageViewsInCategory(collector, page));
    });

    return [Promise.all(pagePromises), Promise.all(subcategoryPromises)];
  })
  .spread(function(pageViews, pageViewsInCategory) {
    return Promise.resolve(
      pageViewsInCategory.reduce(
        function(a, b) {return a.concat(b);},
        pageViews));
  });
};

function PageViewsCollector(params) {
  if (params === undefined) {
       params = {};
  }

  var lang = params.lang || 'en';
  this.wikiClient = new WikiBot({
    server: lang + '.wikipedia.org',
    path: '/w'
  });

  var period = params.period || 30;
  var latest = '/latest30/';
  if (period > 30 && period <= 60) {
    latest = '/latest60/';
  } else if (period > 60 && period <= 90) {
    latest = '/latest90/';
  }
  if (period > 90) {
    throw new Error('period must be not greater than 90 days');
  }

  this.statsEndpoint = 'http://stats.grok.se/json/' + lang + latest;
  this.statsPeriod = period;

  this.getPagesInCategory = Promise.promisify(
    this.wikiClient.getPagesInCategory, {context: this.wikiClient});

  this.randomEngine = Random.engines.mt19937().autoSeed();
}

PageViewsCollector.prototype.getRandomDelay = function() {
  return Random.integer(500, 2000)(this.randomEngine);
};

PageViewsCollector.prototype.getPageViews = function(categoryName) {
  return getPageViewsInCategory(this,
    {title: categoryName, categories: []});
};

module.exports = PageViewsCollector;
