# wpageviews
[![npm version](https://badge.fury.io/js/wpageviews.svg)](https://badge.fury.io/js/wpageviews)

Simple module which helps to get monthly page views for wikipedia pages
belonging to some category and all its subcategories using data from http://stats.grok.se.

**Warning**: statistics is collected for **all** subcategories of given
category, so getting data for high-level categories might take long. There is a random delay (500 to 2000 ms) before each request to  http://stats.grok.se.
Queries to wikipedia API are also throttled by `nodemw` package.

## Installation

    npm install wpageviews --save

## Usage

    var PageViewsCollector = require('wpageviews')

    var pageViewsCollector = new PageViewsCollector({
      server: 'en.wikipedia.org'
    });

    pageViewsCollector.getPageViews('Some category')
    .then(function(pageViewsArray) {
      pageViewsArray.forEach(function(pageViews) {
        // Page title
        console.log(pageViews.title);

        // Array of categories reflecting the path to this page from root category
        // Note that these are not the categories of the page
        console.log(pageViews.categories.join());

        // Total page view for last 30 days
        console.log(pageViews.views);
      });
    });

## Tests

    npm test
