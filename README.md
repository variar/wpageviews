# wpageviews
[![npm version](https://badge.fury.io/js/wpageviews.svg)](https://badge.fury.io/js/wpageviews)
[![Build Status](https://travis-ci.org/variar/wpageviews.svg)](https://travis-ci.org/variar/wpageviews)

Simple module which helps to get monthly page views for wikipedia pages
belonging to some category and all its subcategories using data from http://stats.grok.se.

**Warning**: statistics is collected for **all** subcategories of given
category, so getting data for high-level categories might take long. There is a random delay (500 to 2000 ms) before each request to  http://stats.grok.se.
Queries to wikipedia API are also throttled by `nodemw` package.

You can get total page views for any period from 1 to 90 days. Note, however,
that stats.grok.se return values either for 30, 60 or 90 days. Data is then
sliced to required period. This also means that getting page views for 31 day
takes significantly longer than getting page views for 30 days.


## Installation

    npm install wpageviews --save

## Usage

    var PageViewsCollector = require('wpageviews')

    var pageViewsCollector = new PageViewsCollector({
      lang: 'en',
      period: 7 //valid values are from 1 to 90
    });

    pageViewsCollector.getPageViews('Some category')
    .then(function(pageViewsArray) {
      pageViewsArray.forEach(function(pageViews) {
        // Page title
        console.log(pageViews.title);

        // Array of categories reflecting the path to this page from root category
        // Note that these are not the categories of the page
        console.log(pageViews.categories.join());

        // Total page view for given period
        console.log(pageViews.views);
      });
    });

## Tests

    npm test
