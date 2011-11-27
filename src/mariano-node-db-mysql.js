/*
Copyright (C) 2010, Oleg Efimov <efimovov@gmail.com>

See license text in LICENSE file
*/

// Require modules
var
  util = require('util'),
  mysql = require('db-mysql'),
  conn;

function fetchAllAsyncBenchmark(callback, cfg) {
  var
    start_time,
    total_time,
    factor = cfg.do_not_run_sync_if_async_exists ? 1 : 2,
    res,
    rows;

  start_time = new Date();

  conn.query("SELECT * FROM " + cfg.test_table + ";").execute(function(error, result) {
    if (error) {
        return console.log('ERROR: ' + error);
    }

    total_time = ((new Date()) - start_time) / 1000;
    util.puts("**** " + (factor * cfg.insert_rows_count) + " rows async (fetchAll) selected in " + total_time + "s (" + Math.round(factor * cfg.insert_rows_count / total_time) + "/s)");

    // Finish benchmark
    delete conn;
    callback.apply();
  });
}

function insertAsyncBenchmark(callback, cfg) {
  var
    start_time,
    total_time,
    i = 0;

  start_time = new Date();

  function insertAsync() {
    i += 1;
    if (i <= cfg.insert_rows_count) {
      conn.query(cfg.insert_query).execute(function(error, result) {
        if (error) {
            return console.log('ERROR: ' + error);
        }

        insertAsync();
      });
    } else {
      total_time = ((new Date()) - start_time) / 1000;
      util.puts("**** " + cfg.insert_rows_count + " async insertions in " + total_time + "s (" + Math.round(cfg.insert_rows_count / total_time) + "/s)");

      setTimeout(function () {
        fetchAllAsyncBenchmark(callback, cfg);
      }, cfg.delay_before_select);
    }
  }

  insertAsync();
}

function escapeBenchmark(callback, cfg) {
  var
    start_time,
    total_time,
    i = 0,
    escaped_string;

  start_time = new Date();

  for (i = 0; i < cfg.escape_count; i += 1) {
    escaped_string = conn.escape(cfg.string_to_escape);
  }

  total_time = ((new Date()) - start_time) / 1000;
  util.puts("**** " + cfg.escape_count + " escapes in " + total_time + "s (" + Math.round(cfg.escape_count / total_time) + "/s)");

  insertAsyncBenchmark(callback, cfg);
}

function startBenchmark(callback, cfg) {
  var
    start_time,
    total_time;

  start_time = new Date();

  new mysql.Database({
      hostname: cfg.host,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database
  }).connect(function(error) {
    if (error) {
        return console.log("CONNECTION ERROR: " + error);
    }

    conn = this;

    conn.query("DROP TABLE IF EXISTS " + cfg.test_table + ";").execute(function(error, rows) {
      if (error) {
        return console.log('ERROR: ' + error);
      }

      conn.query(cfg.create_table_query).execute(function(error, rows) {
        if (error) {
          return console.log('ERROR: ' + error);
        }

        total_time = ((new Date()) - start_time) / 1000;
        util.puts("**** Benchmark initialization time is " + total_time + "s");

        escapeBenchmark(callback, cfg);
      });
    });
  });
}

exports.run = function (callback, cfg) {
  startBenchmark(callback, cfg);
};

