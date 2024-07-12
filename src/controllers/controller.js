const Poll = require("../models/polls.js");
const ErrorResponse = require("../Utils/errorResponse.js");
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const PollChain = require("../models/pollchain.js");
const ObjectId = require("mongoose").Types.ObjectId;
const stripe = require('stripe')('sk_test_51JJGl0FoXys89NW04r4hH2267S50MXfFvo5fjbpt9r9fLjbF8EhSIQ4zotZimfKiDv3Wch2ckzz5Fr0kKZqHLFq800QGBKCc1k');
const MY_DOMAIN = 'https://voteable-app.onrender.com';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');



let amount = 0;

//I just made a massive change in my Database with just a few lines of code 😂

module.exports.changeUsersPasswords = async function (req, res, next) {
  console.log('Started');
  const users = await User.find().select("+password");

  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    const password = generateRandomPassword(8);
    user.password = password;
    await user.save();
  }
  console.log('Doneeeee!');
};


// Complete
module.exports.createPoll = async function (req, res, next) {
  try {

    if (!req.body.options)
      return next(new ErrorResponse("Please add not less than 2 options", 400));

    if (!req.body.owner) {
      return next(new ErrorResponse("You have to login / signup to create a poll", 400));
    }

    if (req.body.options.length < 2)
      return next(new ErrorResponse("Please add not less than 2 options", 400));

    const poll = await Poll.create({
      question: req.body.question,
      options: req.body.options,
      owner: req.body.owner.name.trim(),
      class: req.body.class.trim(),
      house: req.body.house.trim()
    });

    console.log(poll);

    res.status(200).json({
      success: true,
      data: poll,
    });
  } catch (err) {
    next(err);
  }
};

module.exports.get_user = async function (req, res, next) {
  const user = await User.findOne({ Student_ID: req.body.Student_ID }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid student ID, please try again", 400));
  }

  const isMatch = user.password.trim() == `${ req.body.password }`.trim();

  if (!isMatch) {
    return next(new ErrorResponse("Invalid password", 400));
  }

  console.log(user.name);
  res.status(200).json({
    user: user
  });
};

// Complete
module.exports.myPolls = async function (req, res, next) {

  const student = await User.findOne({ Student_ID: req.body.Student_ID }).select("+password");


  if (student == null) {
    return next(new ErrorResponse("Student account does not exist", 401));
  }

  const isMatch = student.password.trim() == `${ req.body.password }`.trim();


  if (!isMatch) {
    return next(new ErrorResponse("Invalid Student password", 401));
  }

  // if(req.body.name !== student.name || req.body.password !== student.password)

  // if (!req.body.class || req.body.class == null) {
  //   return next(new ErrorResponse("Please enter a class", 401));
  // }

  // if (!req.body.house || req.body.house == null) {
  //   return next(new ErrorResponse("Please enter a house", 401));
  // }

  // const Polls = [];

  const pollsAll = await Poll.find({
    class: "N/A",
    house: "N/A"
  });

  const pollsClass = await Poll.find({
    class: student.class
  });

  const pollsHouse = await Poll.find({
    house: student.house
  });



  const Polls = [...pollsClass, ...pollsHouse, ...pollsAll];

  // const Polls = await Poll.find();

  if (Polls.length == 0) {
    return next(new ErrorResponse("No polls found", 404));
  }


  // const sortedPolls = Polls.sort((a, b) => {
  //   return b.created - a.created;
  // });

  res.status(200).json({
    success: true,
    data: Polls,
    student: student
  });
};

// Complete
module.exports.findPoll = async function (req, res, next) {
  // if (!req.body.user) {
  //   return next(new ErrorResponse("Login First to access polls", 401));
  // }
  const poll = await Poll.findById(req.params.pollId);

  if (!poll) {
    return next(new ErrorResponse("No poll found", 404));
  }
  res.status(200).json({
    success: true,
    data: poll,
  });
};

// Complete
module.exports.vote = async function (req, res, next) {
  const student = await User.findOne({ Student_ID: req.body.Student_ID }).select("+password");

  if (student == null) {
    return next(new ErrorResponse("Student account does not exist", 401));
  }

  const isMatch = student.password.trim() == `${ req.body.password }`.trim();



  if (!isMatch) {
    return next(new ErrorResponse("Invalid Student password", 401));
  }

  if (!ObjectId.isValid(req.params.pollId)) {
    return next(new ErrorResponse("No poll found", 404));
  }

  if (!ObjectId.isValid(req.params.pollId)) {
    return next(new ErrorResponse("No poll found", 404));
  }

  const poll = await Poll.findById(req.params.pollId);

  if (!req.body.answer) {
    return next(new ErrorResponse("Please choose an option", 400));
  }

  if (poll.voted.includes(student.name.trim().toLowerCase())) {
    return next(new ErrorResponse("Already voted", 401));
  }
  for (let i = 0; i < poll.options.length; i++) {
    if (poll.options[i].text == req.body.answer) {
      poll.options[i].votes += 1;
      poll.voted.push(student.name.trim().toLowerCase());
      await poll.save();
    }
  }
  res.status(200).json({
    success: true,
    data: poll,
  });
};

// Complete
module.exports.deletePoll = async function (req, res, next) {
  try {
    if (!ObjectId.isValid(req.params.pollId)) {
      return next(new ErrorResponse("No poll found", 404));
    }
    let poll = await Poll.findById(req.params.pollId);

    if (!poll) {
      return next(new ErrorResponse("Poll not found", 404));
    }
    await Poll.findByIdAndDelete(req.params.pollId);

    res.status(200).json({
      sucess: true,
      message: "Poll successfully deleted",
    });
  } catch (err) {
    next(err);
  }
};

// Complete
module.exports.votedUsers = async function (req, res, next) {
  const poll = await Poll.findById(req.params.pollId);

  if (!poll) {
    return next(new ErrorResponse("Poll not found", 404));
  }

  if (poll.voted.length == 0) {
    return next(new ErrorResponse("No user voted yet", 404));
  }

  const lookup = {};
  const array = [];

  for (let m = 0; m < poll.voted.length; m++) {
    const name = poll.voted[m];
    lookup[name] = lookup[name] ? lookup[name] += 1 : lookup[name] = 1;
  }

  for (el in lookup) {
    array.push(el);
  }

  res.status(200).json({
    success: true,
    data: array,
  });

};


module.exports.donate = async function (req, res, next) {
  const session = await stripe.checkout.sessions.create({
    submit_type: 'donate',
    line_items: [
      {
        price: "price_1L7YiyFoXys89NW0roAEGB4F",
        quantity: 1,
      }
    ],
    mode: 'payment',
    success_url: `${ domain }?success=true`,
    cancel_url: `${ domain }?canceled=true`,
  });

  res.redirect(303, session.url);
};

module.exports.checkout = async (req, res) => {
  const price = req.params.price;

  const session = await stripe.checkout.sessions.create({
    billing_address_collection: 'auto',
    line_items: [
      {
        price,
        // For metered billing, do not pass quantity
        quantity: 1,

      },
    ],
    mode: 'subscription',
    success_url: `${ MY_DOMAIN }/my-polls?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ MY_DOMAIN }/home?canceled=true`,
  });

  res.redirect(303, session.url);
};



// Start from here 
module.exports.createPollChain = async function (req, res, next) {

  if (req.body.polls.length < 2) {
    return next(new ErrorResponse("Add more polls to the poll chain", 401));
  }

  const finalPolls = [];
  for (let i = 0; i < req.body.polls.length; i++) {
    const res = await Poll.findOne({ question: req.body.polls[i] });
    if (res) finalPolls.push(res._id);
  }


  const pollChain = await PollChain.create({
    name: req.body.name,
    polls: finalPolls,
    owner: req.body.owner
  });

  res.status(200).json({
    success: true,
    data: pollChain
  });

};
module.exports.viewPollChainPolls = async (req, res, next) => {
  if (!ObjectId.isValid(req.params.id)) {
    return next(new ErrorResponse("No poll found", 404));
  }

  const pollChain = await PollChain.findById(req.params.id);

  if (!pollChain) {
    return next(new ErrorResponse("No poll found", 404));
  }

  const result = [];

  for (let i of pollChain.polls) {
    result.push(await Poll.findOne({ _id: i }));
  }
  res.status(200).json({
    success: true,
    data: result,
    name: pollChain.name
  });

};

module.exports.deletePollChain = async (req, res, next) => {
  await PollChain.findByIdAndDelete(req.params.id);

  res.status(200).json({
    sucess: true,
    message: "Poll successfully deleted",
  });
};
module.exports.viewPollChains = async (req, res, next) => {
  const pollChains = await PollChain.find();

  if (pollChains.length === 0) {
    return next(new ErrorResponse('No polls found', 404));
  }

  res.status(200).json({
    success: true,
    data: pollChains
  });
};

module.exports.webhook = async (request, response) => {
  const endpointSecret = 'whsec_154f7a10783744f036d6eab4c1419a57bc47b8f4ce994d5a7e7320b65c75de60';
  let event = request.body;
  if (endpointSecret) {
    // Get the signature sent by Stripe
    const signature = request.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }
  }
  let subscription;
  let status;
  // Handle the event

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!');
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('PaymentMethod was attached to a Customer!');
      break;
    case 'invoice.paid':
      status = event.type;
      amount = event.data.object.amount_paid;
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${ event.type }`);
  }
  // Return a 200 response to acknowledge receipt of the event
  response.send();
};