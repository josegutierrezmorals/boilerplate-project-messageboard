'use strict';
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).catch(err => console.error('MongoDB error:', err));

const replySchema = new mongoose.Schema({
  text:            { type: String, required: true },
  created_on:      { type: Date, default: Date.now },
  delete_password: { type: String, required: true },
  reported:        { type: Boolean, default: false },
});

const threadSchema = new mongoose.Schema({
  board:           { type: String, required: true },
  text:            { type: String, required: true },
  created_on:      { type: Date, default: Date.now },
  bumped_on:       { type: Date, default: Date.now },
  reported:        { type: Boolean, default: false },
  delete_password: { type: String, required: true },
  replies:         { type: [replySchema], default: [] },
});

const Thread = mongoose.model('Thread', threadSchema);

module.exports = function (app) {

  // POST new thread
  app.route('/api/threads/:board')
    .post(async function (req, res) {
      try {
        const { text, delete_password } = req.body;
        const board = req.params.board;
        const thread = new Thread({ board, text, delete_password });
        await thread.save();
        res.redirect(`/b/${board}/`);
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    // GET 10 most recent threads with 3 replies each
    .get(async function (req, res) {
      try {
        const board = req.params.board;
        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .lean();

        const result = threads.map(t => ({
          _id: t._id,
          text: t.text,
          created_on: t.created_on,
          bumped_on: t.bumped_on,
          replies: t.replies
            .sort((a, b) => new Date(b.created_on) - new Date(a.created_on))
            .slice(0, 3)
            .map(r => ({
              _id: r._id,
              text: r.text,
              created_on: r.created_on,
            })),
          replycount: t.replies.length,
        }));

        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    // DELETE thread
    .delete(async function (req, res) {
      try {
        const { thread_id, delete_password } = req.body;
        const thread = await Thread.findById(thread_id);
        if (!thread) return res.send('incorrect password');
        if (thread.delete_password !== delete_password) return res.send('incorrect password');
        await Thread.findByIdAndDelete(thread_id);
        res.send('success');
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    // PUT report thread
    .put(async function (req, res) {
      try {
        const { thread_id } = req.body;
        await Thread.findByIdAndUpdate(thread_id, { reported: true });
        res.send('reported');
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    });

  // POST new reply
  app.route('/api/replies/:board')
    .post(async function (req, res) {
      try {
        const { thread_id, text, delete_password } = req.body;
        const board = req.params.board;
        const reply = { text, delete_password, created_on: new Date() };
        await Thread.findByIdAndUpdate(thread_id, {
          $push: { replies: reply },
          bumped_on: new Date(),
        });
        res.redirect(`/b/${board}/${thread_id}`);
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    // GET single thread with all replies
    .get(async function (req, res) {
      try {
        const { thread_id } = req.query;
        const thread = await Thread.findById(thread_id).lean();
        if (!thread) return res.status(404).send('Thread not found');

        const result = {
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: thread.replies.map(r => ({
            _id: r._id,
            text: r.text,
            created_on: r.created_on,
          })),
        };

        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    // DELETE reply
    .delete(async function (req, res) {
      try {
        const { thread_id, reply_id, delete_password } = req.body;
        const thread = await Thread.findById(thread_id);
        if (!thread) return res.send('incorrect password');
        const reply = thread.replies.id(reply_id);
        if (!reply || reply.delete_password !== delete_password) return res.send('incorrect password');
        reply.text = '[deleted]';
        await thread.save();
        res.send('success');
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    })

    // PUT report reply
    .put(async function (req, res) {
      try {
        const { thread_id, reply_id } = req.body;
        await Thread.findOneAndUpdate(
          { _id: thread_id, 'replies._id': reply_id },
          { $set: { 'replies.$.reported': true } }
        );
        res.send('reported');
      } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
      }
    });
};
