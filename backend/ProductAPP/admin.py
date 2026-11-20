from django.contrib import admin
from ProductAPP.models import Category, Product, Cart, CartItem, Order, OrderItem
# Register your models here.

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id','name', 'slug', 'is_active', 'created_at']
    prepopulated_fields = {'slug': ('name',)}  # Automatically fill slug based on name

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'category', 'unit', 'unit_value', 'price', 'stock', 'is_available', 'created_at']
    prepopulated_fields = {'slug': ('name',)}  # Automatically fill slug based on name

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    model = CartItem
    fields = ['product', 'qty']

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    model = Cart
    fields = ['user', 'created_at']

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    model = OrderItem
    fields = ['order', 'product', 'qty', 'price']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    model = Order
    fields = ['user', 'total_amount', 'status', 'created_at']
    readonly_fields = ['created_at']