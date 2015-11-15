var WikiBot = require('nodemw');
var Q = require('q');
var axios = require('axios');
var urlencode = require('urlencode');
var Random = require('random-js');

var getPageViews = function(collector, page) {
  var delay = collector.getRandomDelay();
  console.log('Gettings satats for page %s, delay: %d', page.title, delay);
  return Q.delay(delay).
  then(function() {
    return axios.get('http://stats.grok.se/json/ru/latest30/' + urlencode(page.title))
  })
  .then(function(response) {
    console.log('Stats response for page %s: %s', page.title, response.statusText);
    var views = response.data;

    var dailyViews = [];
    for (var date in views.daily_views) {
      dailyViews.push(views.daily_views[date]);
    }

    var totalViews = dailyViews.reduce(function(a, b) {return a + b;});

    page.views = totalViews;
    return Q.resolve({
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

    return [Q.all(pagePromises), Q.all(subcategoryPromises)];
  })
  .spread(function(pageViews, pageViewsInCategory) {
    return Q.resolve(
      pageViewsInCategory.reduce(
        function(a, b) {return a.concat(b);},
        pageViews));
  });
};

function PageViewsCollector(params) {
  if (params === undefined) {
       params = {};
  }

  this.wikiClient = new WikiBot({
    server: params.server || 'en.wikipedia.org',
    path: '/w'
  });

  this.getPagesInCategory = Q.nbind(
    this.wikiClient.getPagesInCategory,
    this.wikiClient);

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
