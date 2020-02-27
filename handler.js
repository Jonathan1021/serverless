'use strict';

const OrderManager = require('./dynamo-db/OrderManager')

const uuidv1 = require('uuid/v1');
const AWS = require('aws-sdk');

var sqs = new AWS.SQS({
  region: process.env.REGION
});
const QUEUE_URL = process.env.PENDING_ORDER_QUEUE;

const hacerPedido = (event, context, callback) => {
  console.log('HacerPedido fue llamada');
  const orderId = uuidv1();
  const body = JSON.parse(event.body);
  const message = Object.assign({
    orderId
  }, body)

  const params = {
    MessageBody: JSON.stringify(message),
    QueueUrl: QUEUE_URL
  };

  sqs.sendMessage(params, function (err, data) {
    if (err) {
      sendResponse(500, err, callback);
    } else {
      const message = {
        orderId: orderId,
        messageId: data.MessageId
      };
      sendResponse(200, message, callback);
    }
  });
};

const prepararPedido = (event, context, callback) => {
  console.log('Preparar pedido');
  const order = JSON.parse(event.Records[0].body);
  OrderManager
    .saveCompletedOrder(order)
    .then(data => {
      console.log('data :', data);
      callback()
    })
    .catch(err => {
      callback(err)
    })
}

const enviarPedido = (event, context, callback) => {
  console.log(`Enviar Pedido: ${event}`);
  const record = event.Records[0];
  console.log(`Record: ${JSON.stringify(record)}`);
  if (record.eventName === 'INSERT') {
    console.log('deliverOrder');

    const orderId = record.dynamodb.Keys.orderId.S;

    OrderManager
      .deliverOrder(orderId)
      .then(data => {
        console.log(data);
        callback();
      })
      .catch(error => {
        callback(error);
      });
  } else {
    console.log('is not a new record');
    callback();
  }
}

const estadoOrden = (event, context, callback) => {
  console.log('Estado pedido fue llamado');
  const orderId = event.pathParameters && event.pathParameters.orderId;
  if (orderId) {
    OrderManager
      .getOrderStatus(orderId)
      .then(order => {
        sendResponse(200, `El estado de la orden: ${orderId} es ${order.delivery_status}`, callback);
      })
      .catch(error => {
        sendResponse(500, 'Hubo un error al procesar el pedido', callback);
      });
  } else {
    sendResponse(400, 'Falta el orderId', callback);
  }
}

const sendResponse = (statusCode, message, callback) => {
  const response = {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
  callback(null, response);
}

module.exports = {
  hacerPedido,
  prepararPedido,
  enviarPedido,
  estadoOrden
}