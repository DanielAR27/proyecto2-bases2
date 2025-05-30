// src/services/elasticService.js
const { elasticClient, PRODUCT_INDEX, createProductIndex } = require('../config/elastic');

const elasticService = {
  // Indexar un producto

  /* istanbul ignore next */
  async indexProduct(product) {
    try {
      // Si no hay descripción, usar valor por defecto
      const { _id, __v, ...productData } = product;
      
      const productToIndex = {
        ...productData,
        descripcion: productData.descripcion || 'Producto sin descripción'
      };

      await elasticClient.index({
        index: PRODUCT_INDEX,
        id: product.id_producto.toString(),
        document: productToIndex
      });
      
      return true;
    } catch (error) {
      console.error('Error indexando producto:', error);
      throw error;
    }
  },

  // Buscar productos por texto
  async searchProducts(query, from = 0, size = 10) {
    try {
      const response = await elasticClient.search({
        index: PRODUCT_INDEX,
        body: {
          from,
          size,
          query: {
            multi_match: {
              query,
              fields: ['nombre^3', 'categoria^2', 'descripcion'],
              fuzziness: 'AUTO'
            }
          }
        }
      });

      return {
        total: response.hits.total.value,
        products: response.hits.hits.map(hit => ({
          ...hit._source,
          score: hit._score
        }))
      };
    } catch (error) {
      /* istanbul ignore next */
      console.error('Error buscando productos:', error);
      /* istanbul ignore next */
      throw error;
    }
  },

  // Buscar productos por categoría
  async searchProductsByCategory(category, from = 0, size = 10) {
    try {
      const response = await elasticClient.search({
        index: PRODUCT_INDEX,
        body: {
          from,
          size,
          query: {
            match: {
              'categoria.keyword': category
            }
          }
        }
      });

      return {
        total: response.hits.total.value,
        products: response.hits.hits.map(hit => ({
          ...hit._source,
          score: hit._score
        }))
      };
    } catch (error) {
      /* istanbul ignore next */
      console.error('Error buscando productos por categoría:', error);
      /* istanbul ignore next */
      throw error;
    }
  },

  // Eliminar un producto del índice

  /* istanbul ignore next */
  async deleteProduct(productId) {
    try {
      await elasticClient.delete({
        index: PRODUCT_INDEX,
        id: productId.toString()
      });
      
      return true;
    } catch (error) {
      console.error('Error eliminando producto del índice:', error);
      throw error;
    }
  },

  /* istanbul ignore next */
  async getProductCount() {
    try {
      const response = await elasticClient.count({
        index: PRODUCT_INDEX
      });
      
      return response.count;
    } catch (error) {
      console.error('Error contando productos:', error);
      return 0;
    }
  },

  // Reindexar todos los productos
  async reindexAllProducts(products) {
    try {
      // Eliminar índice existente
      const indexExists = await elasticClient.indices.exists({
        index: PRODUCT_INDEX
      });
      
      if (indexExists) {
        await elasticClient.indices.delete({
          index: PRODUCT_INDEX
        });
      }
      
      // Recrear el índice
      await createProductIndex();
      
      console.log("Productos a indexar:", products.length);
      
      // Indexar productos uno por uno para identificar problemas específicos
      for (const product of products) {
        try {
          // Eliminar campos de MongoDB u otros campos problemáticos
          const { _id, __v, ...productData } = product;
          
          // Asegurarse de que los campos obligatorios estén presentes
          const productToIndex = {
            ...productData,
            nombre: productData.nombre,
            categoria: productData.categoria,
            descripcion: productData.descripcion || "Producto sin descripción",
            precio: productData.precio,
            id_menu: productData.id_menu
          };
          
          console.log(`Indexando producto ${productToIndex.id_producto}: ${productToIndex.nombre}`);
          
          // Indexar producto individual
          await elasticClient.index({
            index: PRODUCT_INDEX,
            id: productToIndex.id_producto.toString(),
            document: productToIndex
          });
        } catch (productError) {
          /* istanbul ignore next */
          console.error(`Error indexando producto ${product.id_producto}:`, productError);
          /* istanbul ignore next */
          console.log("Datos del producto con error:", JSON.stringify(product, null, 2));
        }
      }
      
      // Refrescar el índice para que las búsquedas encuentren datos inmediatamente
      await elasticClient.indices.refresh({ index: PRODUCT_INDEX });
      
      return true;
    } catch (error) {
      /* istanbul ignore next */
      console.error('Error reindexando productos:', error);
      /* istanbul ignore next */
      throw error;
    }
  }
};

module.exports = elasticService;