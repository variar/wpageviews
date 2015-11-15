
var should = require('chai').should();
var sinon = require('sinon');
var rewire = require('rewire');
var Q = require('q');

var PageViews = rewire('../index.js');

var axiosStub = {
  get: function(string) {
    throw new Error();
  }
};
PageViews.__set__('axios', axiosStub);

describe('create page views collector', function() {
  describe('with default params', function() {
    it('should use en server', function() {
      var pageViewsCollector = new PageViews();
      pageViewsCollector.wikiClient.server.should.equal('en.wikipedia.org');
      pageViewsCollector.statsEndpoint.should.equal('http://stats.grok.se/json/en/latest30/');
    });
  });

  describe('with not default lang', function() {
    it('should use passed lang for wiki and stats', function() {
      var params = {lang: 'ru'};
      var pageViewsCollector = new PageViews(params);
      pageViewsCollector.wikiClient.server.should.equal('ru.wikipedia.org');
      pageViewsCollector.statsEndpoint.should.equal('http://stats.grok.se/json/ru/latest30/');
    });
  });

  describe('with not default period', function() {
    it('should provide this period', function() {
      var params = {period: 7};
      var pageViewsCollector = new PageViews(params);
      pageViewsCollector.statsPeriod.should.equal(params.period);
    });
  });

  describe('with period < 30', function() {
    it('should use latest30 endpoint', function() {
      var params = {period: 7};
      var pageViewsCollector = new PageViews(params);
      pageViewsCollector.statsEndpoint.should.equal('http://stats.grok.se/json/en/latest30/');
    });
  });

  describe('with period = 30', function() {
    it('should use latest30 endpoint', function() {
      var params = {period: 30};
      var pageViewsCollector = new PageViews(params);
      pageViewsCollector.statsEndpoint.should.equal('http://stats.grok.se/json/en/latest30/');
    });
  });

  describe('with  30<period<60', function() {
    it('should use latest60 endpoint', function() {
      var params = {period: 37};
      var pageViewsCollector = new PageViews(params);
      pageViewsCollector.statsEndpoint.should.equal('http://stats.grok.se/json/en/latest60/');
    });
  });

  describe('with period = 60', function() {
    it('should use latest60 endpoint', function() {
      var params = {period: 60};
      var pageViewsCollector = new PageViews(params);
      pageViewsCollector.statsEndpoint.should.equal('http://stats.grok.se/json/en/latest60/');
    });
  });

  describe('with  60<period<90', function() {
    it('should use latest90 endpoint', function() {
      var params = {period: 67};
      var pageViewsCollector = new PageViews(params);
      pageViewsCollector.statsEndpoint.should.equal('http://stats.grok.se/json/en/latest90/');
    });
  });

  describe('with  period = 90', function() {
    it('should use latest90 endpoint', function() {
      var params = {period: 90};
      var pageViewsCollector = new PageViews(params);
      pageViewsCollector.statsEndpoint.should.equal('http://stats.grok.se/json/en/latest90/');
    });
  });

  describe('with  period > 90', function() {
    it('should throw', function() {
      var params = {period: 91};
      should.Throw(function() {new PageViews(params);});
    });
  });
});

describe('page views query delau', function() {
  it('should be from 500 to 2000', function() {
    var pageViewsCollector = new PageViews();
    pageViewsCollector.getRandomDelay().should.be.within(500,2000);
  });
});

describe('get page views', function() {
  var sandbox = {};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    axiosStub.get = sandbox.stub(axiosStub, 'get', function(url) {
      url.should.have.string('http://stats.grok.se/json/en/latest30/');
      return Q.resolve({
        statusText: 'OK',
        data: {
          daily_views: {
            "123": 10,
            "456": 20
          }
        }
      });
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('without subcategories', function() {
    describe('with single page', function() {
      it('should get page views for page', function(done) {
        var pageViewsCollector = new PageViews();

        pageViewsCollector.getRandomDelay = sandbox.stub(
          pageViewsCollector, 'getRandomDelay', function() {return 0;}
        );

        pageViewsCollector.getPagesInCategory = sandbox.stub(
          pageViewsCollector, 'getPagesInCategory',
          function(categoryTitle) {
            categoryTitle.should.equal('Category');
            return Q.resolve([{ns: 0, title: 'Page'}]);
          }
        );

        pageViewsCollector.getPageViews('Category')
        .then(function(pageViews) {
          pageViews.should.have.length(1);
          pageViews[0].views.should.equal(30);
          done();
        })
        .catch(done);
      });
    });

    describe('with several pages', function() {
      it('should get page views for all pages', function(done) {
        var pageViewsCollector = new PageViews();

        pageViewsCollector.getRandomDelay = sandbox.stub(
          pageViewsCollector, 'getRandomDelay', function() {return 0;}
        );

        pageViewsCollector.getPagesInCategory = sandbox.stub(
          pageViewsCollector, 'getPagesInCategory',
          function(categoryTitle) {
            categoryTitle.should.equal('Category');
            return Q.resolve(
              [{ns: 0, title: 'Page'}, {ns: 0, title: 'Page1'}]);
          }
        );

        pageViewsCollector.getPageViews('Category')
        .then(function(pageViews) {
          pageViews.should.have.length(2);
          pageViews[1].views.should.equal(30);
          done();
        })
        .catch(done);
      });
    });

    describe('with unknown page types', function() {
      it('should ignore unknown page types', function(done) {
        var pageViewsCollector = new PageViews();

        pageViewsCollector.getRandomDelay = sandbox.stub(
          pageViewsCollector, 'getRandomDelay', function() {return 0;}
        );

        pageViewsCollector.getPagesInCategory = sandbox.stub(
          pageViewsCollector, 'getPagesInCategory',
          function(categoryTitle) {
            categoryTitle.should.equal('Category');
            return Q.resolve(
              [{ns: 0, title: 'Page'}, {ns: 1, title: 'Page1'}]);
          }
        );

        pageViewsCollector.getPageViews('Category')
        .then(function(pageViews) {
          pageViews.should.have.length(1);
          done();
        })
        .catch(done);
      });
    });

  });

  describe('with subcategories', function() {
    it('should get pages in subcategories', function(done) {
      var pageViewsCollector = new PageViews();

      pageViewsCollector.getRandomDelay = sandbox.stub(
        pageViewsCollector, 'getRandomDelay', function() {return 0;}
      );

      pageViewsCollector.getPagesInCategory = sandbox.stub(
        pageViewsCollector, 'getPagesInCategory',
        function(categoryTitle) {
          if (categoryTitle === 'Category') {
            return Q.resolve(
              [{ns: 0, title: 'Page'}, {ns: 14, title: 'Category:SubCategory'}]);
          } else {
            categoryTitle.should.equal('SubCategory');
            return Q.resolve(
              [{ns: 0, title: 'Page1'}]);
          }
        }
      );

      pageViewsCollector.getPageViews('Category')
      .then(function(pageViews) {
        pageViews.should.have.length(2);
        pageViews[1].views.should.equal(30);
        done();
      })
      .catch(done);
    });
  });

  describe('with not default period', function() {
    it('should get page views for that period', function(done) {
      var pageViewsCollector = new PageViews({period:1});

      pageViewsCollector.getRandomDelay = sandbox.stub(
        pageViewsCollector, 'getRandomDelay', function() {return 0;}
      );

      pageViewsCollector.getPagesInCategory = sandbox.stub(
        pageViewsCollector, 'getPagesInCategory',
        function(categoryTitle) {
          categoryTitle.should.equal('Category');
          return Q.resolve([{ns: 0, title: 'Page'}]);
        }
      );

      pageViewsCollector.getPageViews('Category')
      .then(function(pageViews) {
        pageViews[0].views.should.be.below(30);
        done();
      })
      .catch(done);
    });
  });
});
