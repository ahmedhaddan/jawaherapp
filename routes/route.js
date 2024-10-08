const express = require('express');
const route = express.Router();
const mysql = require('mysql2');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Ensure fs is imported



// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/products'); // Specify your upload directory
  },
  filename: function (req, file, cb) {
    // Use Date.now() to make filenames unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); // Generate unique file names
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Set file size limit to 5MB
});

//ENV CONFIG
dotenv.config({ path: "./config.env" });
//MySQL CONFIG
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});
//CONECTION MYSQL
connection.connect((err) => {
  if (err) {
    console.error('Error connecting: ' + err.stack);
    return;
  }
  console.log('Connected as ids ' + connection.threadId);
});


route.post('/api/add-product-details', (req, res) => {
  try {
    const { product_name, price, sale_price, stock, tags } = req.body;

    // Insert the product details into the database
    const query = 'INSERT INTO products (product_name, price, sale_price, stock, tags) VALUES (?, ?, ?, ?, ?)';

    connection.query(query, [product_name, price, sale_price, stock, tags], (err, results) => {
      if (err) {
        console.error('Error inserting data: ' + err.stack);
        return res.status(500).json({ error: 'Database error' });
      }

      // Return the product ID to the client for image association
      res.status(201).json({ message: 'Product details saved successfully', productId: results.insertId });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});
route.post('/api/update-product', (req, res) => {
  const { id, product_name, price, sale_price, stock, tags } = req.body;
  const query = 'UPDATE products SET product_name = ?, price = ?, sale_price = ?, stock = ?, tags = ? WHERE id = ?';

  connection.query(query, [product_name, price, sale_price, stock, tags, id], (err, results) => {
    if (err) {
      console.error('Error updating product: ' + err.stack);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(200).json({ message: 'Product updated successfully' });
  });
});
route.post('/api/delete-products', (req, res) => {
  const { ids } = req.body;

  if (!ids || !ids.length) {
    return res.status(400).json({ error: 'No product IDs provided' });
  }

  // SQL query to delete multiple products based on their IDs
  const query = 'DELETE FROM products WHERE id IN (?)';

  connection.query(query, [ids], (err, results) => {
    if (err) {
      console.error('Error deleting products: ' + err.stack);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ message: 'Products deleted successfully' });
  });
});
route.post('/api/upload-product-image', upload.single('product_image'), (req, res) => {
  try {
    // Get the uploaded file and productId from the request
    const uploadedFile = req.file;
    const productId = req.body.product_id;


    console.log('uploadedFile',req.file )
    console.log('productId',productId )
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Generate the image path
    const imagePath = `/images/products/${Date.now()}-${uploadedFile.name}`;
    uploadedFile.mv(imagePath, (err) => {
      if (err) {
        console.error('Error moving file:', err);
        return res.status(500).json({ error: 'File upload failed' });
      }
    // Update the product's image path in the database
    const query = 'UPDATE products SET image_path = ? WHERE id = ?';

    connection.query(query, [imagePath, productId], (err) => {
      if (err) {
        console.error('Error updating image path: ' + err.stack);
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(200).json({ message: 'Image uploaded successfully', imagePath: imagePath });
    });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});
route.post('/api/add-customer', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and Email are required' });
  }

  const query = 'INSERT INTO customers (name, email) VALUES (?, ? )';
  connection.query(query, [name, email ], (err, results) => {
    if (err) {
      console.error('Error adding customer:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.status(201).json({ message: 'Customer added successfully' });
  });
});

route.get('/api/order-items/:orderId', (req, res) => {
  const { orderId } = req.params;

  const query = 'SELECT * FROM order_items WHERE order_id = ?';

  connection.query(query, [orderId], (err, results) => {
    if (err) {
      console.error('Error fetching order items:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json(results);
  });
});
// API endpoint to get all tags
route.get('/api/tags', (req, res) => {
  const query = 'SELECT id, tag_name FROM tags'; // Adjust according to your table structure
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching tags: ' + err.stack);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json(results); // Send the fetched tags as JSON
  });
});
// Update product API
route.post('/api/add-order', (req, res) => {
  const { customerId, paymentMethod, status, orderItems, totalPrice } = req.body;
console.log('totalPrice', totalPrice)
  // Insert the order into the `orders` table
  const orderQuery = 'INSERT INTO orders (customer_id, payment_method, status, total_price) VALUES (?, ?, ?, ?)';
  connection.query(orderQuery, [customerId, paymentMethod, status, totalPrice], (err, orderResult) => {
    if (err) {
      console.error('Error adding order:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const orderId = orderResult.insertId;

    // For each order item, fetch the product name and insert all details into `order_items` table
    const orderItemsData = [];

    // Loop through each order item and fetch `product_name`
    orderItems.forEach(item => {
      const productQuery = 'SELECT product_name FROM products WHERE id = ?';
      connection.query(productQuery, [item.productId], (prodErr, prodResults) => {
        if (prodErr) {
          console.error('Error fetching product name:', prodErr);
          return res.status(500).json({ error: 'Database error' });
        }

        // Get product name
        const productName = prodResults[0].product_name;

        // Store order_id, product_id, product_name, quantity, and price
        orderItemsData.push([orderId, item.productId, productName, item.quantity, item.price]);

        // Check if all items are processed before inserting into `order_items`
        if (orderItemsData.length === orderItems.length) {
          // Insert into `order_items` table with all details
          const orderItemQuery = 'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?';
          connection.query(orderItemQuery, [orderItemsData], (itemErr) => {
            if (itemErr) {
              console.error('Error adding order items:', itemErr);
              return res.status(500).json({ error: 'Database error' });
            }

            res.status(201).json({ message: 'Order added successfully' });
          });
        }
      });
    });
  });
});
route.get('/order-details/:orderId', (req, res) => {
  const { orderId } = req.params;

  // Fetch order details (order info, items, customer details)
  const orderQuery = `
    SELECT 
      orders.*,
      customers.name AS customer_name,
      customers.email AS customer_email
    FROM orders
    JOIN customers ON orders.customer_id = customers.id
    WHERE orders.id = ?
  `;

  connection.query(orderQuery, [orderId], (err, orderResults) => {
    if (err) {
      console.error('Error fetching order details:', err);
      return res.status(500).send('Database error');
    }

    if (orderResults.length === 0) {
      return res.status(404).send('Order not found');
    }

    const order = orderResults[0];

    // Fetch order items
    const itemsQuery = `
      SELECT 
        order_items.*,
        products.product_name
      FROM order_items
      JOIN products ON order_items.product_id = products.id
      WHERE order_items.order_id = ?
    `;

    connection.query(itemsQuery, [orderId], (itemsErr, itemsResults) => {
      if (itemsErr) {
        console.error('Error fetching order items:', itemsErr);
        return res.status(500).send('Database error');
      }

      // Ensure the order object is passed correctly to the EJS template
      res.render('ecommerce-order-details', {
        title: `Order #${orderId}`,
        order,
        items: itemsResults
      });
    });
  });
});
route.post('/api/delete-orders', (req, res) => {
  const { orderIds } = req.body;

  if (!orderIds || !orderIds.length) {
    return res.status(400).json({ error: 'No order IDs provided for deletion' });
  }

  // Delete associated order items first
  const deleteOrderItemsQuery = 'DELETE FROM order_items WHERE order_id IN (?)';

  connection.query(deleteOrderItemsQuery, [orderIds], (err) => {
    if (err) {
      console.error('Error deleting order items:', err);
      return res.status(500).json({ error: 'Database error when deleting order items' });
    }

    // After deleting order items, delete the orders
    const deleteOrdersQuery = 'DELETE FROM orders WHERE id IN (?)';

    connection.query(deleteOrdersQuery, [orderIds], (orderErr) => {
      if (orderErr) {
        console.error('Error deleting orders:', orderErr);
        return res.status(500).json({ error: 'Database error when deleting orders' });
      }

      res.status(200).json({ message: 'Orders deleted successfully' });
    });
  });
});
route.post('/api/delete-customers', (req, res) => {
  const { ids } = req.body;

  if (!ids || !ids.length) {
    return res.status(400).json({ error: 'No customer IDs provided' });
  }

  // SQL query to delete multiple customers based on their IDs
  const query = 'DELETE FROM customers WHERE id IN (?)';

  connection.query(query, [ids], (err, results) => {
    if (err) {
      console.error('Error deleting customers: ' + err.stack);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ message: 'Customers deleted successfully' });
  });
});


//new invocie

route.get('/invoice/:orderId', (req, res) => {
  const orderId = req.params.orderId;

  // Fetch order details from the database based on `orderId`
  const orderQuery = 'SELECT * FROM orders WHERE id = ?';
  connection.query(orderQuery, [orderId], (err, orderResult) => {
    if (err || orderResult.length === 0) {
      console.error('Error fetching order:', err);
      return res.status(500).send('Error fetching order.');
    }

    // Fetch order items
    const itemsQuery = 'SELECT * FROM order_items WHERE order_id = ?';
    connection.query(itemsQuery, [orderId], (itemsErr, itemsResult) => {
      if (itemsErr) {
        console.error('Error fetching order items:', itemsErr);
        return res.status(500).send('Error fetching order items.');
      }

      // Render the invoice template with order and items data
      res.render('apps-invoice', {
        title: 'Invoice Orders',
        order: orderResult[0], // assuming `orderResult` contains the order details
        items: itemsResult // assuming `itemsResult` contains all items in the order
      });
    });
  });
})
// route.post('/api/cancel-order/:orderId', (req, res) => {
//   const { orderId } = req.params;
//
//   // Update the order status to "canceled"
//   const updateStatusQuery = 'UPDATE orders SET status = ? WHERE id = ?';
//   connection.query(updateStatusQuery, ['canceled', orderId], (err, results) => {
//     if (err) {
//       console.error('Error updating order status:', err);
//       return res.status(500).json({ error: 'Database error' });
//     }
//
//     res.status(200).json({ message: 'Order status updated to canceled successfully' });
//   });
// });

route.post('/api/update-order-status/:orderId', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!['completed', 'canceled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const query = 'UPDATE orders SET status = ? WHERE id = ?';

  connection.query(query, [status, orderId], (err, result) => {
    if (err) {
      console.error('Error updating order status:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ message: `Order status updated to ${status}` });
  });
});

//////
// Route to add a new contact
route.post('/api/add-contact', (req, res) => {
  const { vendor_name, vendor_email, vendor_phone, vendor_address, vendor_note } = req.body;

  if (!vendor_name || !vendor_email || !vendor_phone) {
    return res.status(400).json({ error: 'Vendor Name, Email, and Phone are required.' });
  }

  const query = 'INSERT INTO contacts (vendor_name, vendor_email, vendor_phone, vendor_address, vendor_note) VALUES (?, ?, ?, ?, ?)';

  connection.query(query, [vendor_name, vendor_email, vendor_phone, vendor_address, vendor_note], (err, results) => {
    if (err) {
      console.error('Error inserting contact:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ message: 'Contact added successfully' });
  });
});
route.post('/api/delete-contacts', (req, res) => {
  const { ids } = req.body;

  if (!ids || !ids.length) {
    return res.status(400).json({ error: 'No contact IDs provided' });
  }

  // SQL query to delete multiple contacts based on their IDs
  const query = 'DELETE FROM contacts WHERE id IN (?)';

  connection.query(query, [ids], (err, results) => {
    if (err) {
      console.error('Error deleting contacts: ' + err.stack);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ message: 'Contacts deleted successfully' });
  });
});

route.get('/advanced-animation', (req, res, next) => {
  res.render('advanced-animation', {title: 'Advanced Animation', layout: 'partials/layout-vertical'});
})

route.get('/advanced-clipboard', (req, res, next) => {
  res.render('advanced-clipboard', {title: 'Advanced Clipboard'});
})

route.get('/advanced-dragula', (req, res, next) => {
  res.render('advanced-dragula', {title: 'Advanced Dragula'});
})

route.get('/advanced-files', (req, res, next) => {
  res.render('advanced-files', {title: 'Advanced Files'});
})

route.get('/advanced-highlight', (req, res, next) => {
  res.render('advanced-highlight', {title: 'Advanced Highlight'});
})

route.get('/advanced-rangeslider', (req, res, next) => {
  res.render('advanced-rangeslider', {title: 'Advanced Rangeslider'});
})

route.get('/advanced-ratings', (req, res, next) => {
  res.render('advanced-ratings', {title: 'Advanced Ratings'});
})

route.get('/advanced-ribbons', (req, res, next) => {
  res.render('advanced-ribbons', {title: 'Advanced Ribbons'});
})

route.get('/advanced-sweetalerts', (req, res, next) => {
  res.render('advanced-sweetalerts', {title: 'Advanced Sweetalerts'});
})

route.get('/advanced-toasts', (req, res, next) => {
  res.render('advanced-toasts', {title: 'Advanced Toasts'});
})

route.get('/analytics-customers', (req, res, next) => {
  res.render('analytics-customers', {title: 'Analytics Customers'});
})

route.get('/analytics-reports', (req, res, next) => {
  res.render('analytics-reports', {title: 'Analytics Reports'});
})

route.get('/apps-calendar', (req, res, next) => {
  res.render('apps-calendar', {title: 'Apps Calendar'});
})

route.get('/apps-chat', (req, res, next) => {
  res.render('apps-chat', {title: 'Apps Chat'});
})

route.get('/apps-contact-list', (req, res, next) => {

  const query = 'SELECT * FROM contacts';

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching contacts:', err);
      return res.status(500).send('Database error');
    }

    // Render the EJS page and pass the contacts data
    res.render('apps-contact-list', { title: 'Contacts', contacts: results });
  });
})

route.get('/apps-invoice', (req, res, next) => {
  res.render('apps-invoice', {title: 'Apps Invoice'});
})

route.get('/auth-404', (req, res, next) => {
  res.render('auth-404', {title: 'Auth 404', layout: 'partials/layout-auth'});
})

route.get('/auth-500', (req, res, next) => {
  res.render('auth-500', {title: 'Auth 500', layout: 'partials/layout-auth'});
})

route.get('/auth-lock-screen', (req, res, next) => {
  res.render('auth-lock-screen', {title: 'Auth Lock Screen', layout: 'partials/layout-auth'});
})

route.get('/login', (req, res, next) => {
  res.render('login', {title: 'Auth Login', layout: 'partials/layout-auth'});
})

route.get('/auth-maintenance', (req, res, next) => {
  res.render('auth-maintenance', {title: 'Auth Maintenance', layout: 'partials/layout-auth'});
})

route.get('/auth-recover-pw', (req, res, next) => {
  res.render('auth-recover-pw', {title: 'Auth Recover Pw', layout: 'partials/layout-auth'});
})

route.get('/auth-register', (req, res, next) => {
  res.render('auth-register', {title: 'Auth Register', layout: 'partials/layout-auth'});
})

route.get('/charts-apex', (req, res, next) => {
  res.render('charts-apex', {title: 'Charts Apex'});
})

route.get('/charts-chartjs', (req, res, next) => {
  res.render('charts-chartjs', {title: 'Charts Chartjs'});
})

route.get('/charts-echarts', (req, res, next) => {
  res.render('charts-echarts', {title: 'Charts Echarts'});
})

route.get('/charts-justgage', (req, res, next) => {
  res.render('charts-justgage', {title: 'Charts Justgage'});
})

route.get('/charts-toast-ui', (req, res, next) => {
  res.render('charts-toast-ui', {title: 'Charts Toast Ui'});
})

route.get('/ecommerce-customer-details', (req, res, next) => {
  res.render('ecommerce-customer-details', {title: 'Ecommerce Customer Details'});
})

route.get('/ecommerce-customers', async (req, res, next) => {
  const query = 'SELECT * FROM customers';

  connection.query(query, async (err, customers) => {
    if (err) {
      console.error('Error fetching customers:', err);
      return res.status(500).send('Database error');
    }

    // Loop through each customer to get their order count and total spent
    for (let customer of customers) {
      const statsQuery = `
        SELECT 
          COUNT(*) as orderCount, 
          COALESCE(SUM(total_price), 0) as totalSpent
        FROM orders
        WHERE customer_id = ?
      `;

      // Use a promise to ensure the query is resolved before continuing
      await new Promise((resolve, reject) => {
        connection.query(statsQuery, [customer.id], (statsErr, statsResults) => {
          if (statsErr) {
            console.error('Error fetching customer stats:', statsErr);
            reject();
          } else {
            // Attach orderCount and totalSpent to each customer
            customer.orderCount = statsResults[0].orderCount;
            customer.totalSpent = statsResults[0].totalSpent;
            resolve();
          }
        });
      });
    }

    // Render the EJS page and pass the enriched customers data
    res.render('ecommerce-customers', { title: 'customers', customers });
  });
});


route.get('/ecommerce-index', (req, res, next) => {

  const revenueQuery = `
    SELECT 
      SUM(order_items.quantity * (order_items.price - products.price)) AS total_revenue
    FROM order_items
    JOIN products ON order_items.product_id = products.id;
  `;

  const orderCountQuery = `
    SELECT COUNT(*) AS total_orders FROM orders;
  `;

  const popularProductsQuery = `
    SELECT 
      p.product_name, 
      p.sale_price, 
      p.stock, 
      SUM(oi.quantity) AS total_sold
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_id
    ORDER BY total_sold DESC
    LIMIT 5;  -- Get the top 5 most sold products
  `;

  const recentOrdersQuery = `
    SELECT 
      o.id AS order_id, 
      o.total_price, 
      c.name AS customer_name 
    FROM orders o 
    JOIN customers c ON o.customer_id = c.id 
    ORDER BY o.created_at DESC 
    LIMIT 5;  -- Get the 5 most recent orders
  `;

  // Execute the revenue query
  connection.query(revenueQuery, (revenueErr, revenueResults) => {
    if (revenueErr) {
      console.error('Error fetching revenue:', revenueErr);
      return res.status(500).send('Database error');
    }

    // Execute the order count query
    connection.query(orderCountQuery, (orderErr, orderResults) => {
      if (orderErr) {
        console.error('Error fetching order count:', orderErr);
        return res.status(500).send('Database error');
      }

      // Execute the popular products query
      connection.query(popularProductsQuery, (productsErr, productResults) => {
        if (productsErr) {
          console.error('Error fetching popular products:', productsErr);
          return res.status(500).send('Database error');
        }

        // Execute the recent orders query
        connection.query(recentOrdersQuery, (recentOrdersErr, recentOrdersResults) => {
          if (recentOrdersErr) {
            console.error('Error fetching recent orders:', recentOrdersErr);
            return res.status(500).send('Database error');
          }

          // Get the total revenue, order count, popular products, and recent orders
          const totalRevenue = revenueResults[0].total_revenue ? parseFloat(revenueResults[0].total_revenue) : 0;
          const totalOrders = orderResults[0].total_orders;
          const popularProducts = productResults;
          const recentOrders = recentOrdersResults;

          // Render the dashboard and pass the values to the template
          res.render('ecommerce-index', {
            title: 'Dashboard',
            totalRevenue,
            totalOrders,
            popularProducts,
            recentOrders // Pass recent orders to the template
          });
        });
      });
    });
  });
});



route.get('/ecommerce-order-details', (req, res, next) => {
  res.render('ecommerce-order-details', {title: 'Ecommerce Order Details'});
})

route.get('/ecommerce-orders', (req, res) => {
  // Fetch customers, orders, and products data from the database
  const customerQuery = 'SELECT id, name FROM customers';
  const orderQuery = `
    SELECT 
      orders.id,
      customers.name AS customer_name,
      orders.order_date,
      orders.payment_method,
      orders.status,
      orders.total_price
    FROM orders
    JOIN customers ON orders.customer_id = customers.id
  `;
  const productQuery = 'SELECT id, product_name, sale_price FROM products';

  // Fetch customers
  connection.query(customerQuery, (customerErr, customers) => {
    if (customerErr) {
      console.error('Error fetching customers:', customerErr);
      return res.status(500).send('Database error');
    }

    // Fetch orders
    connection.query(orderQuery, (orderErr, orders) => {
      if (orderErr) {
        console.error('Error fetching orders:', orderErr);
        return res.status(500).send('Database error');
      }

      // Fetch products
      connection.query(productQuery, (productErr, products) => {
        if (productErr) {
          console.error('Error fetching products:', productErr);
          return res.status(500).send('Database error');
        }

        // Render the EJS page with customers, orders, and products data
        res.render('ecommerce-orders', { title: 'Orders List', orders: orders, customers: customers, products: products });
      });
    });
  });
});

route.get('/ecommerce-products', (req, res, next) => {

  const query = `
    SELECT 
      products.*,  -- Fetch all product fields
      tags.tag_name  -- Fetch the corresponding tag_name from the tags table
    FROM 
      products
    LEFT JOIN 
      tags ON products.tags = tags.id  -- Join products and tags based on the tag id
  `;
  connection.query(query, (error, results) => {
    if (error) {
      return res.status(500).send('Error fetching products');
    }

    const formattedResults = results.map(product => {
      return {
        ...product,
        created_at:formatDate(product.created_at),
        updated_at: formatDate(product.updated_at)
      };
    });

  //  res.render('product_page', { products: results });
    res.render('ecommerce-products', {title: 'Ecommerce Products', products: formattedResults });
  });
})


function formatDate(date) {
  const d = new Date(date);
  let day = d.getDate().toString().padStart(2, '0');
  let month = (d.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-based, so add 1
  let year = d.getFullYear().toString().slice(-2); // Get last two digits of the year

  // Get hours and minutes
  let hours = d.getHours().toString().padStart(2, '0');
  let minutes = d.getMinutes().toString().padStart(2, '0');

  // Return formatted date with time
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
route.get('/ecommerce-refunds', (req, res, next) => {
  res.render('ecommerce-refunds', {title: 'Ecommerce Refunds'});
})

route.get('/email-templates-alert', (req, res, next) => {
  res.render('email-templates-alert', {title: 'Email Templates Alert'});
})

route.get('/email-templates-basic', (req, res, next) => {
  res.render('email-templates-basic', {title: 'Email Templates Basic'});
})

route.get('/email-templates-billing', (req, res, next) => {
  res.render('email-templates-billing', {title: 'Email Templates Billing'});
})

route.get('/forms-advanced', (req, res, next) => {
  res.render('forms-advanced', {title: 'Forms Advanced'});
})

route.get('/forms-editors', (req, res, next) => {
  res.render('forms-editors', {title: 'Forms Editors'});
})

route.get('/forms-elements', (req, res, next) => {
  res.render('forms-elements', {title: 'Forms Elements'});
})

route.get('/forms-img-crop', (req, res, next) => {
  res.render('forms-img-crop', {title: 'Forms Img Crop'});
})

route.get('/forms-uploads', (req, res, next) => {
  res.render('forms-uploads', {title: 'Forms Uploads'});
})

route.get('/forms-validation', (req, res, next) => {
  res.render('forms-validation', {title: 'Forms Validation'});
})

route.get('/forms-wizard', (req, res, next) => {
  res.render('forms-wizard', {title: 'Forms Wizard'});
})

route.get('/icons-fontawesome', (req, res, next) => {
  res.render('icons-fontawesome', {title: 'Icons Fontawesome'});
})

route.get('/icons-icofont', (req, res, next) => {
  res.render('icons-icofont', {title: 'Icons Icofont'});
})

route.get('/icons-iconoir', (req, res, next) => {
  res.render('icons-iconoir', {title: 'Icons Iconoir'});
})

route.get('/icons-lineawesome', (req, res, next) => {
  res.render('icons-lineawesome', {title: 'Icons Lineawesome'});
})

route.get('/', (req, res, next) => {

  const revenueQuery = `
    SELECT 
      SUM(order_items.quantity * (order_items.price - products.price)) AS total_revenue
    FROM order_items
    JOIN products ON order_items.product_id = products.id;
  `;

  const orderCountQuery = `
    SELECT COUNT(*) AS total_orders FROM orders;
  `;

  const popularProductsQuery = `
    SELECT 
      p.product_name, 
      p.sale_price, 
      p.stock, 
      SUM(oi.quantity) AS total_sold
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_id
    ORDER BY total_sold DESC
    LIMIT 5;  -- Get the top 5 most sold products
  `;

  const recentOrdersQuery = `
    SELECT 
      o.id AS order_id, 
      o.total_price, 
      c.name AS customer_name 
    FROM orders o 
    JOIN customers c ON o.customer_id = c.id 
    ORDER BY o.created_at DESC 
    LIMIT 5;  -- Get the 5 most recent orders
  `;

  // Execute the revenue query
  connection.query(revenueQuery, (revenueErr, revenueResults) => {
    if (revenueErr) {
      console.error('Error fetching revenue:', revenueErr);
      return res.status(500).send('Database error');
    }

    // Execute the order count query
    connection.query(orderCountQuery, (orderErr, orderResults) => {
      if (orderErr) {
        console.error('Error fetching order count:', orderErr);
        return res.status(500).send('Database error');
      }

      // Execute the popular products query
      connection.query(popularProductsQuery, (productsErr, productResults) => {
        if (productsErr) {
          console.error('Error fetching popular products:', productsErr);
          return res.status(500).send('Database error');
        }

        // Execute the recent orders query
        connection.query(recentOrdersQuery, (recentOrdersErr, recentOrdersResults) => {
          if (recentOrdersErr) {
            console.error('Error fetching recent orders:', recentOrdersErr);
            return res.status(500).send('Database error');
          }

          // Get the total revenue, order count, popular products, and recent orders
          const totalRevenue = revenueResults[0].total_revenue ? parseFloat(revenueResults[0].total_revenue) : 0;
          const totalOrders = orderResults[0].total_orders;
          const popularProducts = productResults;
          const recentOrders = recentOrdersResults;

          // Render the dashboard and pass the values to the template
          res.render('ecommerce-index', {
            title: 'Dashboard',
            totalRevenue,
            totalOrders,
            popularProducts,
            recentOrders // Pass recent orders to the template
          });
        });
      });
    });
  });
})

route.get('/index', (req, res, next) => {
  res.render('index', {title: 'Index'});
})

route.get('/maps-google', (req, res, next) => {
  res.render('maps-google', {title: 'Maps Google'});
})

route.get('/maps-leaflet', (req, res, next) => {
  res.render('maps-leaflet', {title: 'Maps Leaflet'});
})

route.get('/maps-vector', (req, res, next) => {
  res.render('maps-vector', {title: 'Maps Vector'});
})

route.get('/pages-blogs', (req, res, next) => {
  res.render('pages-blogs', {title: 'Pages Blogs'});
})

route.get('/pages-faq', (req, res, next) => {
  res.render('pages-faq', {title: 'Pages Faq'});
})

route.get('/pages-gallery', (req, res, next) => {
  res.render('pages-gallery', {title: 'Pages Gallery'});
})

route.get('/pages-notifications', (req, res, next) => {
  res.render('pages-notifications', {title: 'Pages Notifications'});
})

route.get('/pages-pricing', (req, res, next) => {
  res.render('pages-pricing', {title: 'Pages Pricing'});
})

route.get('/pages-profile', (req, res, next) => {
  res.render('pages-profile', {title: 'Pages Profile'});
})

route.get('/pages-starter', (req, res, next) => {
  res.render('pages-starter', {title: 'Pages Starter'});
})

route.get('/pages-timeline', (req, res, next) => {
  res.render('pages-timeline', {title: 'Pages Timeline'});
})

route.get('/pages-treeview', (req, res, next) => {
  res.render('pages-treeview', {title: 'Pages Treeview'});
})

route.get('/projects-clients', (req, res, next) => {
  res.render('projects-clients', {title: 'Projects Clients'});
})

route.get('/projects-create', (req, res, next) => {
  res.render('projects-create', {title: 'Projects Create'});
})

route.get('/projects-kanban-board', (req, res, next) => {
  res.render('projects-kanban-board', {title: 'Projects Kanban Board'});
})

route.get('/projects-project', (req, res, next) => {
  res.render('projects-project', {title: 'Projects Project'});
})

route.get('/projects-task', (req, res, next) => {
  res.render('projects-task', {title: 'Projects Task'});
})

route.get('/projects-team', (req, res, next) => {
  res.render('projects-team', {title: 'Projects Team'});
})

route.get('/projects-users', (req, res, next) => {
  res.render('projects-users', {title: 'Projects Users'});
})

route.get('/tables-basic', (req, res, next) => {
  res.render('tables-basic', {title: 'Tables Basic'});
})

route.get('/tables-datatable', (req, res, next) => {
  res.render('tables-datatable', {title: 'Tables Datatable'});
})

route.get('/tables-editable', (req, res, next) => {
  res.render('tables-editable', {title: 'Tables Editable'});
})

route.get('/ui-alerts', (req, res, next) => {
  res.render('ui-alerts', {title: 'Ui Alerts'});
})

route.get('/ui-avatar', (req, res, next) => {
  res.render('ui-avatar', {title: 'Ui Avatar'});
})

route.get('/ui-badges', (req, res, next) => {
  res.render('ui-badges', {title: 'Ui Badges'});
})

route.get('/ui-buttons', (req, res, next) => {
  res.render('ui-buttons', {title: 'Ui Buttons'});
})

route.get('/ui-cards', (req, res, next) => {
  res.render('ui-cards', {title: 'Ui Cards'});
})

route.get('/ui-carousels', (req, res, next) => {
  res.render('ui-carousels', {title: 'Ui Carousels'});
})

route.get('/ui-dropdowns', (req, res, next) => {
  res.render('ui-dropdowns', {title: 'Ui Dropdowns'});
})

route.get('/ui-grids', (req, res, next) => {
  res.render('ui-grids', {title: 'Ui Grids'});
})

route.get('/ui-images', (req, res, next) => {
  res.render('ui-images', {title: 'Ui Images'});
})

route.get('/ui-list', (req, res, next) => {
  res.render('ui-list', {title: 'Ui List'});
})

route.get('/ui-modals', (req, res, next) => {
  res.render('ui-modals', {title: 'Ui Modals'});
})

route.get('/ui-navbar', (req, res, next) => {
  res.render('ui-navbar', {title: 'Ui Navbar'});
})

route.get('/ui-navs', (req, res, next) => {
  res.render('ui-navs', {title: 'Ui Navs'});
})

route.get('/ui-paginations', (req, res, next) => {
  res.render('ui-paginations', {title: 'Ui Paginations'});
})

route.get('/ui-popover-tooltips', (req, res, next) => {
  res.render('ui-popover-tooltips', {title: 'Ui Popover Tooltips'});
})

route.get('/ui-progress', (req, res, next) => {
  res.render('ui-progress', {title: 'Ui Progress'});
})

route.get('/ui-spinners', (req, res, next) => {
  res.render('ui-spinners', {title: 'Ui Spinners'});
})

route.get('/ui-tabs-accordions', (req, res, next) => {
  res.render('ui-tabs-accordions', {title: 'Ui Tabs Accordions'});
})

route.get('/ui-typography', (req, res, next) => {
  res.render('ui-typography', {title: 'Ui Typography'});
})

route.get('/ui-videos', (req, res, next) => {
  res.render('ui-videos', {title: 'Ui Videos'});
})


module.exports  = route;
