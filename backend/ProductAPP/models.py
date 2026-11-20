from django.db import models
from django.utils.text import slugify

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name



class Product(models.Model):
    # Unit Choices for Fresh Produce
    UNIT_CHOICES = (
        ('kg', 'Kilogram'),
        ('gm', 'Gram'),
        ('pc', 'Piece'),
        ('pack', 'Pack'),
        ('ltr', 'Liter'),
    )

    category = models.ForeignKey( Category,  on_delete=models.CASCADE,  related_name='products' )

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField()
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Inventory & Freshness Details
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='kg')
    unit_value = models.CharField(max_length=50, help_text="e.g. 500g, 1 kg, 1 Pc")
    stock = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)  # Homepage par highlight karne ke liye
    
    # Media
    image = models.ImageField(upload_to='products/',blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.name}-{self.unit_value}")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.unit_value})"


from django.conf import settings  # User model ke liye standard tareeqa
class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart of {self.user}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product,on_delete=models.CASCADE)
    qty = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.qty} x {self.product.name}"



# First I create a Model for Order and Order Item

class Order(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE) 
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default="Pending")
    created_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return str(self.total_amount)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', )
    product = models.ForeignKey(Product, on_delete=models.CASCADE,)
    qty = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2, )

    def __str__(self):
        return f"{self.qty} x {self.product.name} in Order {self.order.id}"


