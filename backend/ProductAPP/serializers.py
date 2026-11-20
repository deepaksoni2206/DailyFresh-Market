from .models import Category, Product,Cart,CartItem, Order, OrderItem
from rest_framework import serializers


class Categoryserializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        # fields = "__all__"
        fields = ['id', 'name', 'slug','description', 'is_active', ]


class ProductSeraiizer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only= True)
    category_slug = serializers.CharField(source = "category.slug", read_only = True)

    class Meta:
        model = Product
        # fields = "__all__"
        fields = ['id', 'name', 'slug', 'description', 'price', 'discount_price', 'unit', 'unit_value', 'stock', 'is_available', 'is_featured', 'image', 'category','category_name', 'category_slug']


# Serializer ka process
# 1. CartItemSerializer har item ka data serialize karega.
# 2. many=True use karna, kyunki cart mein multiple items ho sakte hain.

class CartSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cart
        fields ="__all__"


'''
Serializer ka process
1. product_id aur quantity validate karta hai.
2. create() method run hota hai.
3. Database mein check karta hai ki product cart mein pehle se hai ya nahi.
4. Product already hai → error.
5. Product nahi hai → CartItem create karta hai.

'''

# for POST Method Only
class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only= True )
    class Meta:
        model = CartItem
        fields = ["id", "product", "product_name","qty"]  # Model ke exact fields match kiye hain
        read_only_fields = ["id"]

    def validate_qty(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be positive.")
        return value

    def create(self, validated_data):
        cart = self.context["cart"]
        product = validated_data["product"]
        qty = validated_data["qty"]

        # Check if product is already in the user's cart
        item = CartItem.objects.filter(cart=cart, product=product).first()

        if item:
            raise serializers.ValidationError("Product already in cart.")

        # Naya item create karein (model mein 'qty' field use ho raha hai)
        return CartItem.objects.create(
            cart=cart,
            product=product,
            qty=qty
        )





# ek naya product serializer
class CartProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        # Sirf wahi fields rakhein jo cart mein dikhani hain
        fields = ['id', 'name', 'slug', 'unit','unit_value', 'price', 'discount_price', 'image', 'stock']

# For Get ONLY Serailizer

class CartItemDetailSerializer(serializers.ModelSerializer):
    product = CartProductSerializer(read_only=True)  # Yahan nested details aayengi
    subtotal = serializers.SerializerMethodField()
    class Meta:
        model = CartItem
        fields = ["id", "product", "qty", "subtotal"]

    def get_subtotal(self, obj):
        # Aapka simple aur samajhne mein aasan if-else logic
        if obj.product.discount_price:
            price = obj.product.discount_price
        else:
            price = obj.product.price
            
        # Price ko quantity se multiply karke subtotal return kar rahe hain
        return float(price) * obj.qty



# order and order item serializers


class OrderItemSerializer(serializers.ModelSerializer):
    product = CartProductSerializer(read_only=True)  # Nested product details

    class Meta:
        model = OrderItem
        fields = ["id", "product", "qty", "price"]

class OrderSerializer(serializers.ModelSerializer):

    items = OrderItemSerializer(many=True, read_only=True)  # Nested order items
    class Meta:
        model = Order
        fields = ["id", "total_amount", "status", "created_at", "user", "items"]



    