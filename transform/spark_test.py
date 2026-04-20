from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("Test").getOrCreate()

data = [("Alice", 25), ("Bob", 30), ("George", 65), ("Amy", 45), ("Nick", 27)]

df = spark.createDataFrame(data, ["Name", "Age"])

df.show()
