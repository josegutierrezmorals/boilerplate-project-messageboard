const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

let testThreadId;
let testReplyId;

suite('Functional Tests', function () {

  test('Creating a new thread', function (done) {
    chai.request(server)
      .post('/api/threads/test')
      .send({ text: 'Test thread', delete_password: 'password' })
      .redirects(0)
      .end(function (err, res) {
        assert.isAtMost(res.status, 302);
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each', function (done) {
    chai.request(server)
