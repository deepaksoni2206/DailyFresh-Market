from django.urls import path, include
from .views import CategroyView, ProductSearchView, ProductView, ProductDetailView,CartApiView, ItemsUpdateApiview, Create_Order, OrderListView, OrderDetailView

urlpatterns = [
    path('category/', CategroyView.as_view(), name='category-list'),
    path('products/', ProductView.as_view(), name='product-list'),
    path('products/<int:id>/', ProductDetailView.as_view(), name='product-detail'),
    path("cart/", CartApiView.as_view(), name="cart"), # GET & POST and Delete
    path('cart/item/<int:pk>/', ItemsUpdateApiview.as_view(), name='cart-item-update'),
    path('order-place/', Create_Order.as_view(), name='order-place'),
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/<int:order_id>/', OrderDetailView.as_view(), name='order-detail'),
    path('products/search/', ProductSearchView.as_view(), name='product-search'),

]

