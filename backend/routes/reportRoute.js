import express from 'express';
import {
  createBill,
  createExpenses,
  getExpenses,
  updateExpenses,
  deleteExpenses,
  createInventory,
  getInventory,
  updateInventory,
  deleteInventory,
  createRent,
  getRent,
  createSalary,
  getSalary,
  getSummary,
  updateBillPaymentStatus,
  updateBill,
  deleteBill,
  updateRentStatus,
  updateSalaryPaidStatus,
} from '../controllers/reportsController.js';

import employeeAuth from '../middleware/employeeAuth.js';
import adminOnly from '../middleware/adminOnly.js';

const reportRouter = express.Router();

reportRouter.post("/bill", employeeAuth, createBill);
reportRouter.post("/createBill", employeeAuth, createBill);
reportRouter.post("/expenses", employeeAuth, adminOnly, createExpenses);
reportRouter.post("/inventory", employeeAuth, adminOnly, createInventory);
reportRouter.post("/rent", employeeAuth, adminOnly, createRent);
reportRouter.post("/salary", employeeAuth, adminOnly, createSalary);

reportRouter.get("/bill", employeeAuth, adminOnly, getBill);
reportRouter.get("/expenses", employeeAuth, adminOnly, getExpenses);    
reportRouter.get("/inventory", employeeAuth, adminOnly, getInventory);
reportRouter.get("/rent", employeeAuth, adminOnly, getRent);
reportRouter.get("/salary", employeeAuth, adminOnly, getSalary);
reportRouter.get("/summary", employeeAuth, adminOnly, getSummary);

reportRouter.put("/rent/:id", employeeAuth, adminOnly, updateRentStatus);
reportRouter.put("/salary/:entryId/:empId", employeeAuth, adminOnly, updateSalaryPaidStatus);
reportRouter.put("/bill/:id", employeeAuth, updateBill);
reportRouter.put("/updateBill/:id", employeeAuth, updateBill);
reportRouter.put("/expenses/:id", employeeAuth, adminOnly, updateExpenses);
reportRouter.put("/updateExpenses/:id", employeeAuth, adminOnly, updateExpenses);
reportRouter.put("/inventory/:id", employeeAuth, adminOnly, updateInventory);
reportRouter.put("/updateInventory/:id", employeeAuth, adminOnly, updateInventory);

reportRouter.delete("/bill/:id", employeeAuth, deleteBill);
reportRouter.delete("/deleteBill/:id", employeeAuth, deleteBill);
reportRouter.delete("/expenses/:id", employeeAuth, adminOnly, deleteExpenses);
reportRouter.delete("/deleteExpenses/:id", employeeAuth, adminOnly, deleteExpenses);
reportRouter.delete("/inventory/:id", employeeAuth, adminOnly, deleteInventory);
reportRouter.delete("/deleteInventory/:id", employeeAuth, adminOnly, deleteInventory);

export default reportRouter;