'use strict';

const AWS = require('aws-sdk')
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/*
 order : {
  orderId: String,
  name: String,
  address: String,
  pizzas: Array of Strings,
  delivery_status: READY_FOR_DELIVERY / DELIVERED
  timestamp: timestamp
}
*/

const saveCompletedOrder = order => {
  console.log('Guardar pedido fue llamado');

  order.deliveryStatus = `READY_FOR_DELIVERY`;

  const params = {
    TableName: process.env.COMPLETED_ORDER_TABLE,
    Item: order
  }

  return dynamoDB.put(params).promise();
}

const deliverOrder = orderId => {
  console.log('Enviar una orden fue llamado');

  const params = {
    TableName: process.env.COMPLETED_ORDER_TABLE,
    Key: {
      orderId
    },
    ConditionExpression: 'attribute_exists(orderId)',
    UpdateExpression: 'set deliveryStatus = :v',
    ExpressionAttributeValues: {
      ':v': 'DELIVERED'
    },
    ReturnValues: 'ALL_NEW'
  };

  return dynamoDB
    .update(params)
    .promise()
    .then(response => {
      console.log('order delivered');
      return response.Attributes;
    });
};

const getOrderStatus = orderId => {
  console.log('Obtener estado de orden fue llamado');
  const params = {
    TableName: process.env.COMPLETED_ORDER_TABLE,
    Key: {
      orderId
    }
  };

  return dynamoDB
    .get(params)
    .promise()
    .then(response => {
      return response.Item
    })
}

module.exports = {
  saveCompletedOrder,
  deliverOrder,
  getOrderStatus
}