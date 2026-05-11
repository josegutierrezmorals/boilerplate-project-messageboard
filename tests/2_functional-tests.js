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
      .end(function (err, res) {
        assert.equal(res.status, 200);
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each', function (done) {
    chai.request(server)
      .get('/api/threads/test')
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        testThreadId = res.body[0]._id;
        assert.isAtMost(res.body[0].replies.length, 3);
        assert.notProperty(res.body[0], 'delete_password');
        assert.notProperty(res.body[0], 'reported');
        done();
      });
  });

  test('Deleting a thread with the incorrect password', function (done) {
    chai.request(server)
      .delete('/api/threads/test')
      .send({ thread_id: testThreadId, delete_password: 'wrongpassword' })
      .end(function (err, res) {
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Reporting a thread', function (done) {
    chai.request(server)
      .put('/api/threads/test')
      .send({ thread_id: testThreadId })
      .end(function (err, res) {
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Creating a new reply', function (done) {
    chai.request(server)
      .post('/api/replies/test')
      .send({ thread_id: testThreadId, text: 'Test reply', delete_password: 'password' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        done();
      });
  });

  test('Viewing a single thread with all replies', function (done) {
    chai.request(server)
      .get('/api/replies/test')
      .query({ thread_id: testThreadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'replies');
        testReplyId = res.body.replies[0]._id;
        assert.notProperty(res.body, 'delete_password');
        assert.notProperty(res.body, 'reported');
        done();
      });
  });

  test('Deleting a reply with the incorrect password', function (done) {
    chai.request(server)
      .delete('/api/replies/test')
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'wrongpassword' })
      .end(function (err, res) {
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a reply with the correct password', function (done) {
    chai.request(server)
      .delete('/api/replies/test')
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'password' })
      .end(function (err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a reply', function (done) {
    chai.request(server)
      .put('/api/replies/test')
      .send({ thread_id: testThreadId, reply_id: testReplyId })
      .end(function (err, res) {
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Deleting a thread with the correct password', function (done) {
    chai.request(server)
      .delete('/api/threads/test')
      .send({ thread_id: testThreadId, delete_password: 'password' })
      .end(function (err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });

});
