import mongoose from "mongoose"; // Import mongoose for MongoDB object modeling

// Define the schema for the "Transaction" model
const transactionSchema = new mongoose.Schema({
  type: {
    type: String, // The type of the transaction (income or expense)
    enum: ["income", "expense"], // Restrict the type to either "income" or "expense"
    required: true, // The type is a required field
  },
  amount: {
    type: Number, // The amount of the transaction (numerical value)
    required: true, // The amount is a required field
  },
  currency: {
    type: String, // The currency of the transaction
    enum: ["thing", "rsd", "eur"], // Restrict the currency to "thing", "rsd" (Serbian dinar), or "eur" (Euro)
    required: true, // The currency is a required field
  },
  description: String, // A description of the transaction (optional field)
  date: {
    type: Date, // The date of the transaction
    default: Date.now, // Default value is the current date if not provided
  },
});

// Export the model based on the transaction schema
export default mongoose.model("Transaction", transactionSchema);
