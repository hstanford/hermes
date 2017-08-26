'use strict';

const redis = require("redis"),
    uuidv4 = require('uuid.v4');

const RedisOwl = exports.RedisOwl = function (opts) {
    this.client = redis.createClient(opts);
}

RedisOwl.prototype.generateKey = function (components) {
    // if any component is missing, substitute a *
    return components.map(function (component) {
        return component || '*';
    }).join(':');
}

RedisOwl.prototype.add = function (group, user, text, expiry, cb) {
    const timestamp = new Date().toUTCString();
    const uuid = uuidv4();
    var key = this.generateKey([group, user, uuid]);

    var args = [key, JSON.stringify({
        text: text,
        timestamp: timestamp,
        id: uuid
    })];

    if (expiry)
        args = args.concat(['EX', expiry]);

    args.push(cb);

    this.client.set.apply(this.client, args);
};

RedisOwl.prototype.get = function (group, user, message_id, cb) {
    var self = this;

    var key = self.generateKey([group, user, message_id]);

    self.client.keys(key, function (err, replies) {
        if (err) return cb(err);

        self.client.mget(replies, function (err, res) {
            cb(err, !err && res.map(function (value) {
                return JSON.parse(value);
            }));
        });
    });
};

RedisOwl.prototype.delete = function (group, user, message_id, cb) {
    var self = this;

    var key = self.generateKey([group, user, message_id]);

    self.client.keys(key, function (err, replies) {
        if (err) return cb(err);

        self.client.del(replies, cb);
    });
};

exports.create = function (opts) {
    return new RedisOwl(opts);
}
