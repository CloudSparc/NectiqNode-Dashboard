describe('Device Preview', () => {
  it('should display device preview section', () => {
    cy.visit('public/index.html');
    cy.contains('Device Preview').should('be.visible');
  });

  // Add more tests here as needed
});
